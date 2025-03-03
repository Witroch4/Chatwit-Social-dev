"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editorActionReducer = void 0;
const actions_1 = require("@/types/web-site-builder/actions");
/**
 * Creates the reducer funcdtion for the Website builder.
 *
 * @param {EditorState} state - The initial state of the Website builder
 * @param {EditorAction} action - The action and the payload
 *
 * @returns {EditorState} An object state containing.
 */
const editorActionReducer = (state, action) => {
    switch (action.type) {
        case actions_1.ActionType.AddElement: {
            const { element: newElement, containerId } = action.payload;
            if (!containerId) {
                const newState = {
                    editor: Object.assign(Object.assign({}, state.editor), { elements: [...state.editor.elements, newElement] }),
                };
                return newState;
            }
            const copyElements = cloneDeep(state.editor.elements);
            addElementById(copyElements, containerId, newElement);
            const newState = {
                editor: Object.assign(Object.assign({}, state.editor), { elements: copyElements }),
            };
            return newState;
        }
        case actions_1.ActionType.SelectElement: {
            const selectedElement = action.payload.element;
            const newState = {
                editor: Object.assign(Object.assign({}, state.editor), { selectedElement }),
            };
            return newState;
        }
        case actions_1.ActionType.UnselectElement: {
            const newState = {
                editor: Object.assign(Object.assign({}, state.editor), { selectedElement: undefined }),
            };
            return newState;
        }
        case actions_1.ActionType.DeleteElement: {
            //TODO: find element on multy-dimentional array
            const { elementId } = action.payload;
            const currentElements = [...state.editor.elements];
            const updateElements = currentElements.filter((el) => el.id !== elementId);
            const newState = {
                editor: Object.assign(Object.assign({}, state.editor), { elements: [...updateElements] }),
            };
            return newState;
        }
        case actions_1.ActionType.UpdateElement: {
            const updatedElement = action.payload.element;
            const newElements = [...state.editor.elements];
            const index = newElements.findIndex((el) => el.id === updatedElement.id);
            newElements[index] = updatedElement;
            const newState = {
                editor: Object.assign(Object.assign({}, state.editor), { elements: [...newElements] }),
            };
            return newState;
        }
        default:
            return state;
    }
};
exports.editorActionReducer = editorActionReducer;
/**
 * Adds a new element to the content of an element found by its id in the provided array of elements.
 * If the element with the given id is found, the new element is added to its content array.
 *
 * @param {Element[]} elements - The array of elements to search within.
 * @param {string} id - The id of the element to which the new element should be added.
 * @param {Element} newElement - The new element to add to the found element's content array.
 * @returns {boolean} Returns true if the element with the given id was found and new element added, otherwise false.
 */
const addElementById = (elements, id, newElement) => {
    for (const element of elements) {
        if (element.id === id) {
            if (!element.content) {
                element.content = []; // Initialize content array if it doesn't exist
            }
            element.content = [...element.content, newElement]; // Add new element to content array
            return true; // Element found and new element added
        }
        // Recursively search in child elements
        if (Array.isArray(element.content) && addElementById(element.content, id, newElement)) {
            return true; // Element found and new element added in child elements
        }
    }
    return false; // Element with given id not found
};
function cloneDeep(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneDeep(item));
    }
    if (value !== null && typeof value === "object") {
        const copy = {};
        for (const key in value) {
            if (Object.hasOwn(value, key)) {
                copy[key] = cloneDeep(value[key]);
            }
        }
        return copy;
    }
    if (typeof value === "function") {
        return value.bind({}); // Return a bound copy of the function
    }
    return value;
}
