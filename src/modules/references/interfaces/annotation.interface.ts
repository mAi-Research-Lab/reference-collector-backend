
interface Coordinates {
    x: number
    y: number
}

export interface PositionData {
    page: number
    x: number
    y: number
    width: number
    height: number
    coordinates: Coordinates[]
    selection: {
        start: number
        end: number
        text: string
    }
    rotation: number
    scale: number
}
