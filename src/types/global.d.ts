/// <reference types="./betterncm" />

declare namespace channel {
	export function call(command: string, callback: Function, args: any[]);
	export function encryptId(data: string): string;
}
type NCMInjectPlugin = import("plugin").NCMInjectPlugin;
export interface EAPIRequestConfig {
	/**
	 * 返回响应的数据类型，绝大部分情况下都是 `json`
	 */
	type: string;
	// rome-ignore lint/suspicious/noExplicitAny: 该对象可以是任何序列化成 JSON 的对象
	data?: any;
	method?: string;
	// rome-ignore lint/suspicious/noExplicitAny: 该对象可以是任何序列化成 URI 请求字符串的对象
	query?: { [param: string]: any };
	onload?: Function;
	onerror?: Function;
	oncallback?: Function;
}
interface LEAPIRNCMPlugin extends NCMInjectPlugin {
	eapiRequest<T>(url: string, config: EAPIRequestConfig): Promise<T>;
}

declare global {
	var APP_CONF: any;
	var pluginPath: string;
	var plugin: import("plugin").NCMInjectPlugin;
	var loadedPlugins: {
		LibEAPIRequest: LEAPIRNCMPlugin;
		[pluginId: string]: import("plugin").NCMInjectPlugin | undefined;
	};
	const betterncm: typeof import("betterncm-api/index").default;
	const legacyNativeCmder: any;
	const DEBUG: boolean;
	const OPEN_PAGE_DIRECTLY: boolean;
	const isOSX: boolean;
}
interface Document {
	webkitIsFullScreen: boolean;
}

interface HTMLElement {
	webkitRequestFullScreen: Function;
}
