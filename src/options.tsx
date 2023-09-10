import * as React from 'react';
import {createRoot} from 'react-dom/client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import { ThemeProvider, createTheme } from '@mui/material/styles';

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

const darkTheme = createTheme({
	palette: {
		mode: 'dark',
	},
});

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
		return <>Loading...</>;
	}

	const tableMembers: [React.ReactElement, string][] = [
		[
			<LabeledCheckbox id="markdown" label="Markdown" checked={itemData.markdown} onChecked={onMarkdownChecked} />,
			"Required for all the other features to work. Enables the automatic Markdown conversion."
		]
	]

	return (
		<ThemeProvider theme={darkTheme}>
		<div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
			<h2><b>Magic Markdown</b> Options for "{item.type}" Item</h2>
			<TableContainer component={Paper}>
				<Table aria-label="a dense table">
					<TableHead>
						<TableRow>
							<TableCell>Option</TableCell>
							<TableCell>Description</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						<TableRow>
							{tableMembers.map(m => {
								return <>
									<TableCell component="th" scope="row">
										{m[0]}
									</TableCell>
									<TableCell>
										{m[1]}
									</TableCell>
								</>
							})}
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>
		</div>
		</ThemeProvider>
	);
};

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
