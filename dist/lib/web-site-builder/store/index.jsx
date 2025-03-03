"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = buildWebsiteBuilder;
const react_1 = require("react");
const actions_1 = require("./actions");
/**
 * Creates a Website builder form context and provider component.
 *
 * @param {EditorState} initialState - The initial state of the Website builder
 *
 * @returns {{
 *   WebsiteBuilderContext: React.Context<{
 *       state: EditorState,
 *       dispatch: Dispatch<EditorAction>
 *   }>,
 *   WebsiteBuilderProvider: React.FC<{ children: React.ReactNode }>
 * }} An object containing the Website builder context and provider component.
 */
function buildWebsiteBuilder(initialState) {
    const WebsiteBuilderContext = (0, react_1.createContext)({
        state: initialState,
        dispatch: () => undefined,
    });
    const WebsiteBuilderProvider = ({ children }) => {
        const [state, dispatch] = (0, react_1.useReducer)(actions_1.editorActionReducer, initialState);
        return <WebsiteBuilderContext.Provider value={{ state, dispatch }}>{children}</WebsiteBuilderContext.Provider>;
    };
    return {
        WebsiteBuilderContext,
        WebsiteBuilderProvider,
    };
}
