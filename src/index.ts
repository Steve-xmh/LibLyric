/// <reference types="./types/global" />

export interface DynamicLyricWord {
	time: number;
	duration: number;
	flag: number;
	word: string;
}

export interface LyricLine {
	time: number;
	duration: number;
	originalLyric: string;
	translatedLyric?: string;
	romanLyric?: string;
	dynamicLyricTime?: number;
	dynamicLyric?: DynamicLyricWord[];
}

export interface LyricPureLine {
	time: number;
	lyric: string;
}

interface EAPIResponse {
	code: number;
	error?: string;
}

interface EAPILyric {
	version: number;
	lyric: string;
}

interface EAPILyricResponse extends EAPIResponse {
	lrc?: EAPILyric;
	tlyric?: EAPILyric;
	romalrc?: EAPILyric;
	yrc?: EAPILyric;
}

/**
 * 根据歌曲 ID 获取歌词数据信息
 * @param songId 歌曲ID
 * @returns 歌词数据信息
 */
export function getLyricData(songId: number): Promise<EAPILyricResponse> {
	// 参考
	// orpheus://orpheus/pub/core.e5842f1.js?d7496bf6377403c83793c37f6fbf0300:formatted:27946
	// orpheus://orpheus/pub/core.e5842f1.js?d7496bf6377403c83793c37f6fbf0300:formatted:27424
	return new Promise((resolve, reject) => {
		loadedPlugins.LibEAPIRequest.eapiRequest(
			`${APP_CONF.domain}/api/song/lyric/v1`,
			{
				type: "json",
				query: {
					id: songId,
					cp: false,
					tv: 0,
					lv: 0,
					rv: 0,
					kv: 0,
					yv: 0,
					ytv: 0,
					yrv: 0,
				},
				onload: resolve,
				onerror: reject,
			},
		);
	});
}

export const PURE_MUSIC_LYRIC_LINE = [
	{
		time: 0,
		duration: 5940000,
		originalLyric: "纯音乐，请欣赏",
	},
];

export const PURE_MUSIC_LYRIC_DATA = {
	sgc: false,
	sfy: false,
	qfy: false,
	needDesc: true,
	lrc: {
		version: 1,
		lyric: "[99:00.00]纯音乐，请欣赏\n",
	},
	code: 200,
	briefDesc: null,
};

export function parseLyric(
	original: string,
	translated: string = "",
	roman: string = "",
	dynamic: string = "",
): LyricLine[] {
	if (dynamic.trim().length === 0) {
		const result: LyricLine[] = parsePureLyric(original).map((v) => ({
			time: v.time,
			originalLyric: v.lyric,
			duration: 0,
		}));

		parsePureLyric(translated).forEach((line) => {
			const target = result.find((v) => v.time === line.time);
			if (target) {
				target.translatedLyric = line.lyric;
			}
		});

		parsePureLyric(roman).forEach((line) => {
			const target = result.find((v) => v.time === line.time);
			if (target) {
				target.romanLyric = line.lyric;
			}
		});

		result.sort((a, b) => a.time - b.time);

		// log("原始歌词解析", JSON.parse(JSON.stringify(result)));

		const processed = processLyric(result);

		// log("处理完成歌词解析", JSON.parse(JSON.stringify(processed)));

		for (let i = 0; i < processed.length; i++) {
			if (i < processed.length - 1) {
				processed[i].duration = processed[i + 1].time - processed[i].time;
			}
		}

		return processLyric(result);
	} else {
		const processed = parsePureDynamicLyric(dynamic);

		parsePureLyric(translated).forEach((line) => {
			let target = processed.find((v) => v.time === line.time);
			if (!target) {
				processed.forEach((v) => {
					if (target) {
						if (
							Math.abs(target.time - line.time) > Math.abs(v.time - line.time)
						) {
							target = v;
						}
					} else {
						target = v;
					}
				});
			}
			if (target) {
				target.translatedLyric = target.translatedLyric || "";
				if (target.translatedLyric.length > 0) {
					target.translatedLyric += " ";
				}
				target.translatedLyric += line.lyric;
			}
		});

		parsePureLyric(roman).forEach((line) => {
			// rome-ignore lint/suspicious/noExplicitAny: TypeScript 的类型解析不允许我写成 LyricLine | null，希望有大佬能帮我看看是为什么
			let target: any = null;
			processed.forEach((v) => {
				if (target) {
					if (
						Math.abs(target.time - line.time) > Math.abs(v.time - line.time)
					) {
						target = v;
					}
				} else {
					target = v;
				}
			});
			if (target) {
				target.romanLyric = target.romanLyric || "";
				if (target.romanLyric.length > 0) {
					target.romanLyric += " ";
				}
				target.romanLyric += line.lyric;
			}
		});

		// 插入空行
		for (let i = 0; i < processed.length; i++) {
			const thisLine = processed[i];
			const nextLine = processed[i + 1];
			if (
				thisLine &&
				nextLine &&
				thisLine.originalLyric.trim().length > 0 &&
				nextLine.originalLyric.trim().length > 0 &&
				thisLine.duration > 0
			) {
				const thisLineEndTime =
					(thisLine?.dynamicLyricTime || thisLine.time) + thisLine.duration;
				let nextLineStartTime = nextLine.time;
				if (
					nextLine.dynamicLyricTime &&
					nextLineStartTime > nextLine.dynamicLyricTime
				) {
					nextLineStartTime = nextLine.dynamicLyricTime;
				}
				if (nextLineStartTime - thisLineEndTime >= 5000) {
					processed.splice(i + 1, 0, {
						time: thisLineEndTime,
						originalLyric: "",
						duration: nextLineStartTime - thisLineEndTime,
					});
				}
			}
		}
		return processLyric(processed);
	}
}

const yrcLineRegexp = /^\[(?<time>[0-9]+),(?<duration>[0-9]+)\](?<line>.*)/;
const yrcWordTimeRegexp =
	/^\((?<time>[0-9]+),(?<duration>[0-9]+),(?<flag>[0-9]+)\)(?<word>[^\(]*)/;
const timeRegexp = /^\[((?<min>[0-9]+):)?(?<sec>[0-9]+([\.:]([0-9]+))?)\]/;
export function parsePureLyric(lyric: string): LyricPureLine[] {
	const result: LyricPureLine[] = [];

	for (const line of lyric.split("\n")) {
		let lyric = line.trim();
		const timestamps: number[] = [];
		while (true) {
			const matches = lyric.match(timeRegexp);
			if (matches) {
				const min = Number(matches.groups?.min || "0");
				const sec = Number(matches.groups?.sec.replace(/:/, ".") || "0");
				timestamps.push(Math.floor((min * 60 + sec) * 1000));
				lyric =
					lyric.slice(0, matches.index) +
					lyric.slice((matches.index || 0) + matches[0].length);
				lyric = lyric.trim();
			} else {
				break;
			}
		}
		lyric = lyric.trim();
		for (const time of timestamps) {
			result.push({
				time,
				lyric,
			});
		}
	}

	result.sort((a, b) => a.time - b.time);

	return result;
}

export function parsePureDynamicLyric(lyric: string): LyricLine[] {
	const result: LyricLine[] = [];
	// 解析逐词歌词
	for (const line of lyric.trim().split("\n")) {
		let tmp = line.trim();
		const lineMatches = tmp.match(yrcLineRegexp);
		if (lineMatches) {
			const time = parseInt(lineMatches.groups?.time || "0");
			const duration = parseInt(lineMatches.groups?.duration || "0");
			tmp = lineMatches.groups?.line || "";
			const words: DynamicLyricWord[] = [];
			while (tmp.length > 0) {
				const wordMatches = tmp.match(yrcWordTimeRegexp);
				if (wordMatches) {
					const wordTime = parseInt(wordMatches.groups?.time || "0");
					const wordDuration = parseInt(wordMatches.groups?.duration || "0");
					const flag = parseInt(wordMatches.groups?.flag || "0");
					const word = wordMatches.groups?.word.trimStart();
					const splitedWords = word
						?.split(/\s+/)
						.filter((v) => v.trim().length > 0); // 有些歌词一个单词还是一个句子的就离谱
					if (splitedWords) {
						const splitedDuration = wordDuration / splitedWords.length;
						splitedWords.forEach((subWord, i) => {
							if (i === splitedWords.length - 1) {
								if (word?.endsWith(" ")) {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: `${subWord.trimStart()} `,
									});
								} else {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: subWord.trimStart(),
									});
								}
							} else if (i === 0) {
								if (word?.startsWith(" ")) {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: ` ${subWord.trimStart()}`,
									});
								} else {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: subWord.trimStart(),
									});
								}
							} else {
								words.push({
									time: wordTime + i * splitedDuration,
									duration: splitedDuration,
									flag,
									word: `${subWord.trimStart()} `,
								});
							}
						});
					}
					tmp = tmp.slice(wordMatches.index || 0 + wordMatches[0].length);
				} else {
					break;
				}
			}
			const line: LyricLine = {
				time,
				duration,
				originalLyric: words.map((v) => v.word).join(""),
				dynamicLyric: words,
				dynamicLyricTime: time,
			};
			result.push(line);
			// log("逐词歌词", time, duration, line.originalLyric);
		}
	}
	return result;
}

// 处理歌词，去除一些太短的空格间曲段，并为前摇太长的歌曲加前导空格
export function processLyric(lyric: LyricLine[]): LyricLine[] {
	if (
		lyric.length > 0 &&
		lyric[lyric.length - 1].time === 5940000 &&
		lyric[lyric.length - 1].duration === 0
	) {
		// 纯音乐，请欣赏
		return PURE_MUSIC_LYRIC_LINE;
	}

	const result: LyricLine[] = [];

	let isSpace = false;
	lyric.forEach((thisLyric, i, lyric) => {
		if (thisLyric.originalLyric.trim().length === 0) {
			const nextLyric = lyric[i + 1];
			if (nextLyric && nextLyric.time - thisLyric.time > 5000 && !isSpace) {
				result.push(thisLyric);
				isSpace = true;
			}
		} else {
			isSpace = false;
			result.push(thisLyric);
		}
	});

	while (result[0]?.originalLyric.length === 0) {
		result.shift();
	}

	if (result[0]?.time > 5000) {
		result.unshift({
			time: 500,
			duration: result[0]?.time - 500,
			originalLyric: "",
		});
	}

	return result;
}

plugin.onLoad((injectPlugin) => {
	const plugin = injectPlugin.mainPlugin;
	plugin.parseLyric = parseLyric;
	plugin.getLyricData = getLyricData;
	plugin.parsePureLyric = parsePureLyric;
	plugin.parsePureDynamicLyric = parsePureDynamicLyric;
});
