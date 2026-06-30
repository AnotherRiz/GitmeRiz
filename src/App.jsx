import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="bg-red-500 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">
        Hello World! 🌍
      </h1>
      <p className="text-lg mb-6">
        This should have a red background if Tailwind is working
      </p>
      
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => setCount(count + 1)}
      >
        Count: {count}
      </button>
    </div>
  )
}

export default App