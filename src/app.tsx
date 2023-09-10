import * as React from 'react';
import {createRoot} from 'react-dom/client';

const App: React.FC = () => {
	return (
		<div className="grid wrapper">
			Welcome to Basic Markdown.<br>
			<br>
			Check out the <a href="https://github.com/SomeRanDev/miro-basic-markdown">source code on Github.</a>
		</div>
	);
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
