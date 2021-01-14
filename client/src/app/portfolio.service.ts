import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { UserService } from "./user.service";

@Injectable()
export class PortfolioService{

    portfolioEntry: {} = {}
    baseURL:string = 'http://localhost:3000'

    constructor(private http: HttpClient, private userSvc: UserService){}

    async getList(userId: string): Promise<any>{
        const token = localStorage.getItem('crypto')
        const headers = new HttpHeaders()
            .set('Authorization', 'Bearer '+ token)
        const call =  await this.http.get<any>(`/user/list/${userId}`,
        {headers, observe: 'response'}).toPromise()
        const result = call.body.result

        return result
            
    }

    async addCoin(currency: string, date: string, units:number, boughtPrice:number, targetProfit: number, notify: string): Promise<boolean>{
        const userId = this.userSvc.userId
        const body = {currency, date, units, boughtPrice, targetProfit, notify, userId}
        return await this.http.post<any>(`/addcoin`, body, {observe: 'response'}).toPromise()
            .then(resp => {
                
                if (resp.status == 200){
                    return true
                }else{
                    return false
                }
            })
    }

    async updateEntry(currency: string, date: string, units:number, boughtPrice:number, targetProfit: number, notify: string, entryId: string): Promise<boolean>{
        const userId = this.userSvc.userId
        const body = {currency, date, units, boughtPrice, targetProfit, notify, entryId, userId}

        return await this.http.put<any>(`/updateentry`, body, {observe: 'response'}).toPromise()
            .then( resp => {
                return resp.status==200? true: false
            })
    }

    async deleteEntry(userId: string, entryId: string):Promise<boolean>{
        const params = (new HttpParams())
            .set('entryId', entryId)
            .set('userId', userId)
        
        
        return await this.http.delete<any>(`/deleteentry`, { params, observe: "response" }).toPromise()
            .then(resp => {
                return resp.status==200? true: false
            })
    }

}