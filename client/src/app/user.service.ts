import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";
import { LoginDetails } from "./models";

@Injectable()
export class UserService implements CanActivate{
    private token = ''
    private baseURL = 'http://localhost:3000'
    public userId = ''
    public username = ''
    loggedIn: boolean = false

    constructor(private http: HttpClient, private router: Router){}

    async logInUser(login: LoginDetails): Promise<boolean>{
        this.token = ''//reset token each time
        return await this.http.post<any>(`/login`, 
            login, { observe: 'response'}).toPromise()
            .then(resp => {
                if (resp.status == 200){
                    
                    this.token = resp.body.token
                    this.userId = resp.body.result.user_id
                    this.username = resp.body.result.username
                    
                    this.loggedIn = true
                    //add token to localStorage
                    localStorage.setItem("crypto", this.token)
                }
                
                return (resp.body)
            }).catch(err => {
                console.info('err: ', err)
                return false
            })

    }

    isLogin() {
        return localStorage.getItem('crypto') != null 
        //note!! we still need to validate the token everytime when we access it, 
        //this.token != '' just tells us can login
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot){
        if (this.isLogin())
            return true
        return this.router.parseUrl('/error') //returns a urlTree
    }

    async registerNewUser(username: string, password: string, email: string){
        return await this.http.post<any>(`/register`, {username, password, email},
            {observe: 'response'})
            .toPromise()
            .then(resp => {
                if (resp.status == 200){
                    return true
                }
                
            }).catch(err => {
                console.info('err: ', err)
                return false
            })
    }

    async getUserDetails(): Promise<any>{
        const params = {userId: this.userId}

        const token = localStorage.getItem('crypto')
        
        const headers = new HttpHeaders()
            .set('Authorization', 'Bearer '+ token)
        
        return await this.http.get<any>(`/account`, {params, headers}).toPromise()
            .then(resp => {
                return resp
            })
    }

    async signInWithGoogle() {
        this.token = ''
        window.open('http://localhost:3000/auth/google', "mywindow", "location=1,status=1,scrollbars=1, width=800,height=800");
        let listener = window.addEventListener('message', (message) => {
          //message will contain google user and details
          this.token = message.data.token
          localStorage.setItem("crypto", this.token)
          this.userId = message.data.user.user_id
          this.username = message.data.user.username
          if(this.token !=  ''){
              this.router.navigate(['/main'])
          }
        })
        
    }

    
}