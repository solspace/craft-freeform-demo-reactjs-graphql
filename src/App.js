import QuoteForm from './QuoteForm';

function App() {
    return (
        <main className="flex min-h-screen flex-col items-left justify-left p-5">
            <h2 className="mb-1 text-lg font-semibold text-left">Freeform 4 for Craft 4</h2>
            <h1 className="mb-5 pb-2 text-2xl font-semibold text-left">React JS + GraphQL demo</h1>
            <QuoteForm />
        </main>
    );
}

export default App;
