import * as React from 'react';
import {createRoot} from 'react-dom/client';

const App: React.FC = () => {
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			Welcome to Basic Markdown!
			<br/><br/>
			Check out the <a href="https://github.com/SomeRanDev/miro-basic-markdown">source code on Github.</a>
			<h2>Instructions</h2>
			Simply run the "Enable Markdown" action on any Text, Shape, or Sticky Note.
			<br/><br/>
			It will now convert between raw Markdown syntax and visual HTML when selected and unselected respectively.
			<h2>Supported Syntax</h2>
			<table>
				<tr>
					<th>Syntax</th>
					<th>Output</th>
				</tr>
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
			</table>
		</div>
	);
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
