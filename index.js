const name = "Message Click Actions";

let settings = {
	deleteClick: true,
	doubleClickEdit: true,
	controlClickReply: true
};


let keysDown = {
	Delete: false,
	Control: false
};

let getListener = v => e => {
	if (e.key in keysDown)
		keysDown[e.key] = v;
};
let keyDownListener = getListener(true);
let keyUpListener = getListener(false);


let modules = {};
let getMsgObj = message => message.childrenMessageContent.props.message;

let onClick = message => {
	if (keysDown.Delete && settings.deleteClick) {
		const msg = getMsgObj(message);
		modules.edit.deleteMessage(msg.channel_id, msg.id);
		return;
	}
	if (keysDown.Control && settings.controlClickReply) {
		const msg = getMsgObj(message);
		modules.replyToMessage(modules.getChannel(msg.channel_id), msg);
		return;
	}

	return true;
};

let onDoubleClick = message => {
	if (settings.doubleClickEdit) {
		const msg = getMsgObj(message);
		modules.edit.startEditMessage(msg.channel_id, msg.id, msg.content || '');
	}
};


let unpatch;
export default {
	goosemodHandlers: {
		onImport: async () => {
			let mod = goosemodScope.webpackModules;
			modules.edit = mod.findByProps("startEditMessage");
			modules.getChannel = mod.findByProps("getChannel").getChannel;
			modules.replyToMessage = mod.findByProps("replyToMessage").replyToMessage;

			const messageModule = mod.find(m => m.default && m.default.displayName === "Message");
			unpatch = goosemodScope.patcher.patch(messageModule, "default", (args) => {
				let orig = args[0].onClick;
				args[0].onClick = function() {
					if (onClick(args[0])) orig.apply(this, arguments);
				};

				args[0].onDoubleClick = () => onDoubleClick(args[0]);
			}, true);

			document.addEventListener("keydown", keyDownListener);
			document.addEventListener("keyup", keyUpListener);
		},

		onLoadingFinished: async () => {
			goosemodScope.settings.createItem(name, [
				{
					type: "header",
					text: "Actions",
				},
				{
					type: "toggle",
					text: "Double-Click to edit",
					onToggle: (value) => settings.doubleClickEdit = value,
					isToggled: () => settings.doubleClickEdit,
				},
				{
					type: "toggle",
					text: "Control + Click to reply",
					onToggle: (value) => settings.controlClickReply = value,
					isToggled: () => settings.controlClickReply,
				},
				{
					type: "toggle",
					text: "Delete + Click to delete",
					onToggle: (value) => settings.deleteClick = value,
					isToggled: () => settings.deleteClick,
				}
			]);
		},

		onRemove: async () => {
			goosemodScope.settings.removeItem(name);

			unpatch();

			document.removeEventListener("keydown", keyDownListener);
			document.removeEventListener("keyup", keyUpListener);
		}

		getSettings: () => [settings],
		loadSettings: ([_settings]) => { settings = _settings; }
	}
};
