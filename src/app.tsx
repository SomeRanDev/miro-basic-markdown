import * as React from 'react';
import {createRoot} from 'react-dom/client';

// async function addSticky() {
//	 const stickyNote = await miro.board.createStickyNote({
//		 content: 'Hello, World!',
//	 });

//	 await miro.board.viewport.zoomTo(stickyNote);
// }

const App: React.FC = () => {
//	 React.useEffect(() => {
//		 addSticky();
//	 }, []);

	return (
		<div className="grid wrapper">
			Welcome to SomeRanDev's Utils!
		</div>
	);
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
