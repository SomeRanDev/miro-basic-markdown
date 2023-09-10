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
					// { type: "card" },
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
function convertTextToMarkdown(text: string, isText: boolean): string {
	let inputLines: string[] = text.split(/(?:\n|\<br\>|&nbsp;)+/gi);
	if(inputLines.length === 1) {
		inputLines = inputLines[0]
			.replaceAll(/<p>(.+?)<\/p>/gi, "$1\n")
			.replaceAll(/(<\/ol>|<\/ul>|<\/li>)/gi, "$1\n")
			.split(/\n/);
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
			if(processedLine.endsWith("</ol>") || processedLine.endsWith("</ul>") || processedLine.endsWith("</li>")) {
				outputLines.push(processedLine);
			} else if(isText) {
				outputLines.push(`<p>${processedLine}</p>`);
			} else {
				outputLines.push(`${processedLine}`);
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
