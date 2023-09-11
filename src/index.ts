import {
	CustomEvent,
	Card,
	Text,
	Shape,
	StickyNote,
	Item,
	SelectionUpdateEvent,
	StrokeStyle,
	Json
} from "@mirohq/websdk-types";

// ---
// Types
// ---

export type ContentItem = Text | Shape | StickyNote | Card;

// ---
// Globals
// ---

const MARKDOWN_META_KEY = "mm-original-text";
const AUTOBORDER_META_KEY = "mm-autoborder";

// ---
// init
// ---

export async function init() {
	await initIconClick();
	await initSelectionEvents();
	await initActions();
}

init();

// ---
// util
// ---

function isContentItem(item: Item) {
	return item.type === "text" || item.type === "shape" || item.type === "sticky_note" || item.type === "card";
}

function getItemContent(item: ContentItem): string {
	if(item.type === "card") {
		return item.title;
	} else {
		return item.content;
	}
}

function setItemContent(item: ContentItem, content: string) {
	if(item.type === "card") {
		item.title = content;
	} else {
		item.content = content;
	}
}

function setItemMonoFont(item: ContentItem, isMono: boolean) {
	if(item.type === "text" || item.type === "shape") {
		item.style.fontFamily = isMono ? "roboto_mono" : "arial";
		item.style.fontSize = isMono ? 12 : 14;
	}
}

// ---
// markdown config
// ---

export async function hasMarkdownEnabled(item: Item) {
	return typeof (await getRawMarkdownContent(item)) === "string";
}

export async function getRawMarkdownContent(item: Item): Promise<string> {
	return item.getMetadata(MARKDOWN_META_KEY);
}

export async function setMarkdownEnabled(item: ContentItem, enabled: boolean) {
	if((await hasMarkdownEnabled(item)) === !enabled) {
		await item.setMetadata(MARKDOWN_META_KEY, enabled ? getItemContent(item) : null);
	}
}

// ---
// automatic border config
// ---

export async function hasAutoBorder(item: ContentItem): Promise<boolean> {
	if(item.type === "shape") {
		return (await item.getMetadata(AUTOBORDER_META_KEY)) === true;
	}
	return false;
}

export async function setAutoBorderConfig(item: ContentItem, autoBorder: boolean) {
	await item.setMetadata(AUTOBORDER_META_KEY, autoBorder);
}

let borderOptions: {
	loaded: number,
	incompleteColor: string,
	incompleteStyle: StrokeStyle,
	completeColor: string,
	completeStyle: StrokeStyle
} = {
	loaded: -1,
	incompleteColor: "#ff7777",
	incompleteStyle: "normal",
	completeColor: "#77ff77",
	completeStyle: "dashed"
}

export async function refreshAutoBorder(item: Shape) {
	const loaded = await miro.board.getAppData("border-options-loaded");
	if(typeof loaded === "number" && borderOptions.loaded !== loaded) {
		borderOptions = {
			loaded: loaded,
			incompleteColor: validateBorderColor(await miro.board.getAppData("incomplete-border-color"), "#ff7777"),
			incompleteStyle: validateStrokeStyle(await miro.board.getAppData("incomplete-border-style")),
			completeColor: validateBorderColor(await miro.board.getAppData("complete-border-color"), "#77ff77"),
			completeStyle: validateStrokeStyle(await miro.board.getAppData("complete-border-style"))
		};
	}

	const hasEmptyCheckbox = (await getRawMarkdownContent(item)).includes("[ ]");
	if(!hasEmptyCheckbox) {
		item.style.borderColor = borderOptions.completeColor;
		item.style.borderStyle = borderOptions.completeStyle;
	} else {
		item.style.borderColor = borderOptions.incompleteColor;
		item.style.borderStyle = borderOptions.incompleteStyle;
	}
}

function validateBorderColor(input: Json, defValue: string): string {
	if(typeof input !== "string") return defValue;
	return input;
}

function validateStrokeStyle(input: Json): StrokeStyle {
	if(typeof input !== "string") return "normal";
	if(input === "normal" || input === "dashed" || input === "dotted") {
		return input;
	}
	return "normal";
}

/**
 * Iterates through all items in the list that have a property named "content" of type string.
 * 
 * @param items The items to iterate over.
 * @param callback The callback function called on all items with a `content` string property.
 */
async function forEachItemWithContent(items: Item[], callback: (item: ContentItem) => Promise<boolean>) {
	await Promise.all(items.map(async eventItem => {
		const item = <ContentItem>eventItem;
		if(isContentItem(item)) {
			if(await callback(item)) {
				await item.sync();
			}
		}
	}));
}

// ---

async function initIconClick() {
	await miro.board.ui.on('icon:click', async () => {
		await miro.board.ui.openPanel({
			url: 'app.html'
		});
	});
}

// ---

/**
 * Used internally in `initSelectionEvents` to track the previously selected items.
 */
let selectedTextItems: ContentItem[] = [];

/**
 * Initialize the handle the behavior for selecting items.
 */
async function initSelectionEvents() {
	await miro.board.ui.on("selection:update", async (event: SelectionUpdateEvent) => {
		// Update previously selected items
		selectedTextItems = <ContentItem[]>(await Promise.all(selectedTextItems.map(async item => {
			try {
				// Throws error if item doesn't exist
				return <ContentItem>(await miro.board.getById(item.id));
			} catch(_) {
				return null;
			}
		}))).filter(i => i !== null);

		// Convert all un-selected items into "Markdown"
		selectedTextItems.map(async item => {
			if(!isContentItem(item)) return;
			if(!event.items.some(oldItem => oldItem.id === item.id) && await hasMarkdownEnabled(item)) {
				await item.setMetadata(MARKDOWN_META_KEY, getItemContent(item));
				setItemContent(item, convertTextToMarkdown(getItemContent(item), item.type === "text"));
				setItemMonoFont(item, false);
				if(await hasAutoBorder(item)) {
					await refreshAutoBorder(<Shape>item);
				}
				await item.sync();
			}
		});

		// Clear out selected items
		selectedTextItems = [];

		// Find all selected items with "content", add to list, and convert to text-editable mode
		await forEachItemWithContent(event.items, async item => {
			selectedTextItems.push(item);
			if(await hasMarkdownEnabled(item)) {
				setItemContent(item, await item.getMetadata(MARKDOWN_META_KEY));
				setItemMonoFont(item, true);
				return true;
			}
			return false;
		});
	});
}

/**
 * Register the actions.
 */
async function initActions() {
	registerAction(
		"magic-markdown-options",
		"Markdown Options",
		"Configure the Magic Markdown options for the item.",
		"sparks-filled",
		openMarkdownOptions
	);

	// registerAction(
	// 	"disable-srd-markdown",
	// 	"Disable Markdown",
	// 	"Converts the text into editable format.",
	// 	"pen",
	// 	onMarkdownDisable
	// );
}

/**
 * Register an action for a "content" item.
 * 
 * @param id The action id.
 * @param name Name that appears in Miro.
 * @param description The description that appears in Miro.
 * @param icon The Miro icon.
 * @param func The function called when the action is invoked.
 */
async function registerAction(id: string, name: string, description: string, icon: string, func: (event: CustomEvent) => void) {
	await miro.board.ui.on(`custom:${id}`, func);
	await miro.board.experimental.action.register(
		{
			"event": id,
			"ui": {
				"label": {
					"en": name,
				},
				"icon": icon,
				"description": description,	 
			},
			"scope": "local",
			"predicate": {
				"$or": [
					{ type: "text" },
					{ type: "shape" },
					{ type: "sticky_note" },
					// { type: "card" },
				]
			},
			"contexts": { "item": {} }
		}
	);
}

async function openMarkdownOptions(event: CustomEvent) {
	if(event.items.length === 1) {
		await miro.board.ui.openModal({
			width: 600,
			height: 400,
			url: 'options.html?itemId=' + event.items[0].id
		});
	}
}

/**
 * Enable markdown mode by storing the content in the metadata.
 * 
 * @param event The event passed to the enable-srd-markdown action.
 */
async function onMarkdownEnable(event: CustomEvent) {
	forEachItemWithContent(event.items, async item => {
		await setMarkdownEnabled(item, true);
		return false;
	});
}

/**
 * Disable markdown mode by clearing the markdown metadata entry.
 * 
 * @param event The event passed to the disable-srd-markdown action.
 */
async function onMarkdownDisable(event: CustomEvent) {
	forEachItemWithContent(event.items, async item => {
		setMarkdownEnabled(item, false);
		return false;
	});
}

/**
 * Lazily convert "markdown" text to HTML/emoji text.
 * This could probably be improved.
 * 
 * @param text The "markdown" format text to convert.
 * @returns The HTML/emoji output text.
 */
function convertTextToMarkdown(text: string, isText: boolean): string {
	let inputLines: string[] = text.split(/(?:\n|\<br\>|&nbsp;)+/gi);
	if(inputLines.length === 1) {
		let str = inputLines[0];
		str = str.replaceAll(/<p>(.+?)<\/p>/gi, "$1\n");
		if(isText) {
			// str = str.replaceAll(/(<\/ol>|<\/ul>|<\/li>)/gi, "$1\n");
			str = str.replaceAll(/(<\/ol>|<\/ul>)/gi, "$1\n");
		}
		inputLines = str.split(/\n/);
	}
	const outputLines: string[] = [];

	let liLines: string[] = [];
	let liSpaces = "";

	function processLine(line: string | null) {
		const processedLine = line !== null ? convertLineToMarkdown(line) : null;
		if(processedLine !== null && processedLine.match(/^\s*\*/)) {
			const [_, spaces] = processedLine.match(/^(\s*)\*/)!;
			liLines.push(processedLine.replace(spaces + "*", ""));
			if(liSpaces.length === 0) liSpaces = spaces;
			return;
		} else if(liLines.length > 0) {
			liLines.forEach(li => outputLines.push(`${liSpaces}• ${li}`));
			liLines = [];
			liSpaces = "";
		}

		if(processedLine !== null) {
			if(isText) {
				if(processedLine.endsWith("</ol>") || processedLine.endsWith("</ul>") || processedLine.endsWith("</li>")) {
					outputLines.push(processedLine);
				} else {
					outputLines.push(`<p>${processedLine}</p>`);
				}
			} else {
				outputLines.push(processedLine);
			}
		}
	}

	for(let i = 0; i < inputLines.length; i++) {
		const input = inputLines[i];
		processLine(input);
	}
	processLine(null);

	// TODO: What is the right way to join the lines?
	// &nbsp; definitely bad
	// <br/> or \n?
	return isText ? outputLines.join("") : outputLines.join("<br/>");
}

function convertLineToMarkdown(text: string): string {
	return text
		// _underline_
		.replaceAll(/_([^_]+)_/gi, "<u>$1</u>")

		// **bold**
		.replaceAll(/\*\*([^\*]+)\*\*/gi, "<b>$1</b>")

		// *italic*
		.replaceAll(/\*([^\*]+)\*/gi, "<em>$1</em>")

		// ~strikethrough~
		.replaceAll(/\~([^~]+)\~/gi, "<s>$1</s>")

		// [link](https://miro.com)
		.replaceAll(/\[([^\]]+)\]\(([^)]+)\)/gi, "<a href=\"$2\">$1</a>")

		// [ ] unchecked
		.replaceAll(/\[ \]/gi, "🔲")

		// [x] checked
		.replaceAll(/\[x\]/gi, "✅");
}

/* allowed tags:
<p>
<a>
<strong>
<b>
<em>
<i>
<u>
<s>
<span>
<ol>
<ul>
<li>
<br>
*/
