export interface Coin{
    entryId: string,
    name: string,
    currency: string
    date: string,
    units: number,
    boughtPrice: number,
    targetProfit: number,
    notify: string
}

export interface LoginDetails {
    username: string,
    password: string
}