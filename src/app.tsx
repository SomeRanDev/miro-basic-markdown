import * as React from 'react';
import {createRoot} from 'react-dom/client';

import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

type BorderData = {
	incompleteBorderStyle: string | null,
	incompleteBorderColor: string | null,
	completeBorderStyle: string | null,
	completeBorderColor: string | null,
}

const App: React.FC = () => {
	const [borderData, setBorderData] = React.useState<BorderData>({
		incompleteBorderStyle: null,
		incompleteBorderColor: null,
		completeBorderStyle: null,
		completeBorderColor: null,
	});

	(async () => {
		const defaultIncompleteBorderStyle = await miro.board.getAppData<string | null>("incomplete-border-style");
		const defaultIncompleteBorderColor = await miro.board.getAppData<string | null>("incomplete-border-color");
		const defaultCompleteBorderStyle = await miro.board.getAppData<string | null>("complete-border-style");
		const defaultCompleteBorderColor = await miro.board.getAppData<string | null>("complete-border-color");
		setBorderData({
			incompleteBorderStyle: defaultIncompleteBorderStyle,
			incompleteBorderColor: defaultIncompleteBorderColor,
			completeBorderStyle: defaultCompleteBorderStyle,
			completeBorderColor: defaultCompleteBorderColor,
		});
	})();

	const onSaveBorderSettings = async () => {
		const saveInputElement = async (id: string) => {
			const value = (document.getElementById(id) as HTMLInputElement).value;
			await miro.board.setAppData(id, value || null);
		}

		const saveSelectElement = async (id: string) => {
			const index = (document.getElementById(id) as HTMLSelectElement).tabIndex;
			let t = "normal";
			if(index === 1) t = "dashed";
			if(index === 2) t = "dotted";
			await miro.board.setAppData(id, t);
		}

		await Promise.all([
			saveSelectElement("incomplete-border-style"),
			saveInputElement("incomplete-border-color"),
			saveSelectElement("complete-border-style"),
			saveInputElement("complete-border-color")
		]);

		const optId = "border-options-loaded";
		const oldVal = await miro.board.getAppData(optId);
		await miro.board.setAppData(optId, typeof oldVal === "number" ? (oldVal + 1) : 0);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			Welcome to Magic Markdown!
			<br/><br/>
			Check out the <a target="_blank" href="https://github.com/SomeRanDev/miro-magic-markdown">source code on Github.</a>
			<h2>Instructions</h2>
			Simply run the "Enable Markdown" action on any Text, Shape, or Sticky Note.
			<br/><br/>
			It will now convert between raw Markdown syntax and visual HTML when selected and unselected respectively.
			<h2>Supported Syntax</h2>
			<table className='blackwhite'>
				<thead>
					<tr>
						<th>Syntax</th>
						<th>Output</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>_underline_</td>
						<td><u>underline</u></td>
					</tr>
					<tr>
						<td>*italic*</td>
						<td><i>italic</i></td>
					</tr>
					<tr>
						<td>**bold**</td>
						<td><b>bold</b></td>
					</tr>
					<tr>
						<td>~strikethrough~</td>
						<td><s>strikethrough</s></td>
					</tr>
					<tr>
						<td>[ ] unchecked</td>
						<td>🔲 unchecked</td>
					</tr>
					<tr>
						<td>[x] checked</td>
						<td>✅ checked</td>
					</tr>
					<tr>
						<td>* bullet point</td>
						<td>• bullet point</td>
					</tr>
					<tr>
						<td>[link](https://miro.com)</td>
						<td><a target="_blank" href="https://miro.com">link</a></td>
					</tr>
				</tbody>
			</table>
			<br/>
			<h2>Border Options</h2>
			These configure the automatic borders added to shapes with full checkboxes (complete) or at least one empty (incomplete).
			<br/><br/>
			<table>
				<thead>
					<tr>
						<th>Incomplete</th>
						<th>Complete</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<TextField select id="incomplete-border-style" label="Style"
								defaultValue={borderData.incompleteBorderStyle ?? "dotted"}
								sx={{width: "100%"}}
							>
								<MenuItem key="normal" value="normal">Normal</MenuItem>
								<MenuItem key="dashed" value="dashed">Dashed</MenuItem>
								<MenuItem key="dotted" value="dotted">Dotted</MenuItem>
							</TextField>
						</td>
						<td>
							<TextField select id="complete-border-style" label="Style"
								defaultValue={borderData.completeBorderStyle ?? "normal"}
								sx={{width: "100%"}}
							>
								<MenuItem key="normal" value="normal">Normal</MenuItem>
								<MenuItem key="dashed" value="dashed">Dashed</MenuItem>
								<MenuItem key="dotted" value="dotted">Dotted</MenuItem>
							</TextField>
						</td>
					</tr>
					<tr>
						<td>
							<TextField id="incomplete-border-color" label="Color"
								placeholder="Blank = default" variant="outlined"
								value={borderData.incompleteBorderColor ?? ""}
							/>
						</td>
						<td>
							<TextField id="complete-border-color" label="Color"
								placeholder="Blank = default" variant="outlined"
								value={borderData.completeBorderColor ?? ""}
							/>
						</td>
					</tr>
				</tbody>
			</table>
			<Button variant="contained" onClick={onSaveBorderSettings}>Save Border Settings</Button>
		</div>
	);
};

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
