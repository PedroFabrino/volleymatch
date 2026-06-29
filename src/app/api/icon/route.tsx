import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sizeParam = searchParams.get('size')
  const size = sizeParam ? parseInt(sizeParam) : 512

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb', // blue-600
          borderRadius: '25%',
          color: 'white',
          fontSize: size * 0.5,
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
        }}
      >
        VM
      </div>
    ),
    { width: size, height: size }
  )
}
