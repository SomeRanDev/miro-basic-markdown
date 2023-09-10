import {
	CustomEvent,
	Card,
	Text,
	Shape,
	StickyNote,
	Item,
	SelectionUpdateEvent
} from "@mirohq/websdk-types";

// ---
// Types
// ---

type ContentItem = Text | Shape | StickyNote | Card;

// ---
// Globals
// ---

const MARKDOWN_META_KEY = "original-markdown";

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
		await miro.board.ui.openPanel({ url: 'app.html' });
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
				const r = convertTextToMarkdown(getItemContent(item));
				setItemContent(item, r);
				console.log(r);
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
		"enable-srd-markdown",
		"Enable Markdown",
		"Converts the text into the custom markdown format.",
		"pen",
		onMarkdownEnable
	);

	registerAction(
		"disable-srd-markdown",
		"Disable Markdown",
		"Converts the text into editable format.",
		"pen",
		onMarkdownDisable
	);
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
					{ type: "card" },
				]
			},
			"contexts": { "item": {} }
		}
	);
}

async function hasMarkdownEnabled(item: Item) {
	return typeof (await item.getMetadata(MARKDOWN_META_KEY)) === "string";
}

/**
 * Enable markdown mode by storing the content in the metadata.
 * 
 * @param event The event passed to the enable-srd-markdown action.
 */
async function onMarkdownEnable(event: CustomEvent) {
	forEachItemWithContent(event.items, async item => {
		if(!(await hasMarkdownEnabled(item))) {
			await item.setMetadata(MARKDOWN_META_KEY, getItemContent(item));
		}
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
		if(await hasMarkdownEnabled(item)) {
			await item.setMetadata(MARKDOWN_META_KEY, null);
		}
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
function convertTextToMarkdown(text: string): string {
	const inputLines: string[] = text.split(/[\n|<br>|&nbsp;]+/gi);
	const outputLines: string[] = [];

	let liLines: string[] = [];

	function processLine(line: string | null) {
		if(line !== null && line.match(/^\s*\*/)) {
			liLines.push(convertLineToMarkdown(line));
			return;
		} else if(liLines.length > 0) {
			outputLines.push("<ul>");
			liLines.forEach(li => outputLines.push(`<li>${li}</li>`));
			outputLines.push("</ul>");
			liLines = [];
		}

		if(line !== null) {
			outputLines.push(convertLineToMarkdown(line));
		}
	}

	for(let i = 0; i < inputLines.length; i++) {
		const input = inputLines[i];
		processLine(input);
	}
	processLine(null);

	return outputLines.join("&nbsp;");
}

function convertLineToMarkdown(text: string): string {
	return text
		// _underline_
		.replaceAll(/_([a-zA-Z0-9\s\*]+)_/gi, "<u>$1</u>")

		// **bold**
		.replaceAll(/\*\*([a-zA-Z0-9\s_]+)\*\*/gi, "<b>$1</b>")

		// *italic*
		.replaceAll(/\*([a-zA-Z0-9\s_]+)\*/gi, "<em>$1</em>")

		// ~strikethrough~
		.replaceAll(/\~([a-zA-Z0-9\s]+)\~/gi, "<s>$1</s>")

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
