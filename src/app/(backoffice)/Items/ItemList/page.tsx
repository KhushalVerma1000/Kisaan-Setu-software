import { Unit } from '@/server/features/items/core/entities/Unit';
import React from 'react'

const page = () => {
    const units = Unit.defaultUnits();


  return (
    <div>
        Package
    </div>
  )
}

export default page