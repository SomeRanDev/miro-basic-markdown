import * as React from 'react';
import {createRoot} from 'react-dom/client';

import {LabeledCheckbox} from "./checkbox";

import {
	ContentItem,
	hasMarkdownEnabled,
	enableMarkdown,
	disableMarkdown
} from "./index";

type ItemData = {
	markdown: boolean
}

const App: React.FC = () => {
	const [itemData, setItemData] = React.useState<ItemData>({
		markdown: false
	});

	const [item, setItem] = React.useState<ContentItem | null>(null);

	React.useEffect(() => {
		// Get URL parameters
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const id = urlParams.get("itemId");

		if(!id) {
			return;
		}

		(async () => {
			const item = (await miro.board.getById(id)) as ContentItem;
			setItemData({
				markdown: await hasMarkdownEnabled(item)
			});
			setItem(item);
		})();
	});

	const onMarkdownChecked = (checked: boolean) => {
		if(item !== null) {
			if(checked) {
				enableMarkdown(item);
			} else {
				disableMarkdown(item);
			}
		}
	}

	// Don't render until item is loaded
	if(item === null) {
		return <></>;
	}

	return (
		<div style={{ display: "flex", flexDirection: "row" }}>
			<div>
				<LabeledCheckbox id="markdown" label="Markdown" checked={itemData.markdown} onChecked={onMarkdownChecked} />
			</div>
		</div>
	);
};

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
