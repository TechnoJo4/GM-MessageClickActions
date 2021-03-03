import * as webpackModules from "@goosemod/webpack";
import * as patcher from "@goosemod/patcher";
import * as settings from "@goosemod/settings";

const name = "Message Click Actions";

let moduleSettings = {
    deleteClick: true,
    doubleClickEdit: true,
    controlClickReply: true,
    keepDiscordBehavior: true,
};

const keysDown = {
    Delete: false,
    Control: false,
};

const getListener = (v) => (e) => {
    if (e.key in keysDown) keysDown[e.key] = v;
};
const keyDownListener = getListener(true);
const keyUpListener = getListener(false);

let unpatch;
export default {
    goosemodHandlers: {
        onImport: async () => {
            const { startEditMessage, deleteMessage } = webpackModules.findByProps("startEditMessage");
            const { getChannel } = webpackModules.findByProps("getChannel");
            const { replyToMessage } = webpackModules.findByProps("replyToMessage");

            function doubleClickHandler(props) {
                if (moduleSettings.doubleClickEdit) {
                    const msg = props.message;
                    startEditMessage(
                        msg.channel_id,
                        msg.id,
                        msg.content || ""
                    );
                }
            }

            function onClickHandler(props) {
                const msg = props.message;
                if (keysDown.Delete && moduleSettings.deleteClick) {
                    deleteMessage(msg.channel_id, msg.id);
                    return;
                }
                if (keysDown.Control && moduleSettings.controlClickReply) {
                    replyToMessage(getChannel(msg.channel_id), msg);
                    return;
                }

                return true;
            }

            const Message = webpackModules.find(
                (m) =>
                    m.default &&
                    typeof m.default === "function" && m.default.toString().includes('"className","compact","zalgo",')
            );
            unpatch = patcher.patch(
                Message,
                "default",
                (args) => {
                    const [props] = args;
                    let orig = props.onClick;
                    props.onClick = function () {
                        if (onClickHandler(props.childrenMessageContent.props) && moduleSettings.keepDiscordBehavior)
                            orig.apply(this, arguments);
                    };

                    props.onDoubleClick = () => doubleClickHandler(props.childrenMessageContent.props);
                },
                true
            );

            document.addEventListener("keydown", keyDownListener);
            document.addEventListener("keyup", keyUpListener);
        },

        onLoadingFinished: async () => {
            settings.createItem(name, [
                {
                    type: "header",
                    text: "Actions",
                },
                {
                    type: "toggle",
                    text: "Double-Click to edit",
                    onToggle: (value) => (moduleSettings.doubleClickEdit = value),
                    isToggled: () => moduleSettings.doubleClickEdit,
                },
                {
                    type: "toggle",
                    text: "Control + Click to reply",
                    onToggle: (value) => (moduleSettings.controlClickReply = value),
                    isToggled: () => moduleSettings.controlClickReply,
                },
                {
                    type: "toggle",
                    text: "Delete + Click to delete",
                    onToggle: (value) => (moduleSettings.deleteClick = value),
                    isToggled: () => moduleSettings.deleteClick,
                },
                {
                    type: "toggle",
                    text:
                        "Keep Default Discord Behavior (Alt+Click to mark unread)",
                    onToggle: (value) => (moduleSettings.keepDiscordBehavior = value),
                    isToggled: () => moduleSettings.keepDiscordBehavior,
                },
            ]);
        },

        onRemove: async () => {
            settings.removeItem(name);

            unpatch();

            document.removeEventListener("keydown", keyDownListener);
            document.removeEventListener("keyup", keyUpListener);
        },

        getSettings: () => [moduleSettings],
        loadSettings: ([_settings]) => {
            moduleSettings = _settings;
        },
    },
};
