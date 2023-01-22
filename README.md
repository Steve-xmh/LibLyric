# LibLyric

一个 BetterNCM 插件，用于向其他插件提供获取歌曲歌词和解析歌曲数据的能力

## 简便使用方法

本插件依赖 [`LibEAPIRequest`](https://github.com/BetterNCM/LibEAPIRequest) 插件以请求歌词数据，请将该插件加入到你的插件依赖中。

为保障加载插件顺序，请先在 `manifest.json` 的 `loadAfter` 数组中加入本依赖 ID `liblyric`。

API 详情请参阅源代码

```typescript
/**
 * 根据歌曲 ID 获取歌词数据信息
 * @param songId 歌曲ID
 * @returns 歌词数据信息
 */
function getLyricData(songId: number): Promise<EAPILyricResponse>;
function parseLyric(
  original: string,
  translated: string = "",
  roman: string = "",
  dynamic: string = ""
): LyricLine[];
function parsePureLyric(lyric: string): LyricPureLine[];
function parsePureDynamicLyric(lyric: string): LyricLine[];
```
