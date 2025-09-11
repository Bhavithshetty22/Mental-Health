import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import "@fontsource/poppins"; // Defaults to weight 400
import "@fontsource/poppins/600.css"; // Specific weight
import DailyCheckin from './components/DailyCheckIn';


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div className="maincontainer">
      <div className="logo">
        <h1 className='logotext'>MoodCheck</h1>
      </div>
     <DailyCheckin />
     <div className="container1st">
      <div className="pfp">
        <img src="/pfp1.jpg" alt="" className="dynamicpfp" />
      </div>
      <div className="othercontainer1boxes"></div>
     </div>
    </div>
    </>
  )
}

export default App
