import React from 'react'
import WhitepaperDoc from "./../../assets/whitepaper/INTEGR8 WHITEPAPER - By ABDULHAKEEM MUHAMMED.pdf"

const Whitepaper = () => {
  return (
    <div style={{height: '100vh', width: '100vw'}}>
        <iframe
            src={WhitepaperDoc}
            title='INTEGR8 Whitepaper'
            width='100%'
            height='100%'
            style={{ border: 'none'}}

        />
    </div>
  )
}

export default Whitepaper
