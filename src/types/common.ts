export type TAmiEvent = {
	ActionID?: string;
	Event?: string;
	Identifier?: string;
	Message?: string;
	Response?: string;
	Variable?: { [key: string]: string; };
};

export type TAmiEventType =
	| "ami_connect"
	| "ami_data"
	| "ami_login"
	| "ami_socket_drain"
	| "ami_socket_error"
	| "ami_socket_timeout"
	| "ami_socket_end"
	| "ami_socket_close"
	| "ami_socket_unwritable";

export type TAmiMessageIn = {
	Action: string;
	ActionID?: string;
	Async?: string;
	Events?: string;
	Channel?: string;
	Context?: string;
	Exten?: string;
	Priority?: string;
	Secret?: string;
	Username?: string;
	Variable?: string[];
};

export type TAmiMessageOut = { [key: string]: string; } & {
	Variable?: { [key: string]: string; };
};

export type TAmiMessageToSocket = {
	[key: string]: string | string[];
};

export type TCallBack =
	& ((error: Error, data: null) => void)
	& ((error: null, data: TCallBackData) => void);

export type TCallBackData = TAmiEvent & TAmiMessageOut;

export type TOptions = {
	encoding: BufferEncoding;
	debug: boolean;
	writeToFile: boolean;
	reconnect: boolean;
	reconnectDelay: number;
	identifier?: string;
	logger?: Console;
	events: boolean;
};
