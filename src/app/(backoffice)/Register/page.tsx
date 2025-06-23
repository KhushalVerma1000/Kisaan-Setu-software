'use client'

import { useEffect } from 'react'

export default function TestFPOProfile() {
  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch('/api/fpo/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: 'Frontend Test FPO',
          phone_number: '9999999999',
          city: 'Noida',
        }),
      })

      const data = await res.json()
      console.log('FPO Create Response:', data)
    }

    fetchProfile()
  }, [])

  return <div>Testing FPO profile creation...</div>
}
