import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginDetails } from '../models';
import { UserService } from '../user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  form: FormGroup
  register: boolean = false
  showErrorLoggingIn: boolean = false
  showErrorRegister: boolean = false
  loggedIn: boolean

  constructor(private fb:FormBuilder, private router: Router, 
    //private authSvc: SocialAuthService,
    private userSvc: UserService) { }

  ngOnInit(): void {
    localStorage.clear()
    this.form = this.createLoginForm()
  }

  createLoginForm() {
    return this.fb.group({
      username: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required])
    })
  }

  createRegisterForm(){
    return this.fb.group({
      username: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required]),
      email: this.fb.control('', [Validators.required])
  })
  
}

  signIn(){
    
    const username = this.form.get("username").value
    const password = this.form.get("password").value
    const logindetails = {username, password} as LoginDetails
    this.userSvc.logInUser(logindetails).then(res => {
      console.log("resp from svc: ", res)
      if (res){ //userLogin successful
        this.register = false
        
        //console.log("this.user: ", this.user)
        //navigate to portfolio
        //@ts-ignore
        console.log(res.result.username)
        //@ts-ignore  
        this.router.navigate(['/main'])
      }else {
        this.showErrorLoggingIn = true
      }
    })
    
  }
  changeToRegister(){
    
    this.register = true
    this.form = this.createRegisterForm()
    
  }

  registerNewAcct(){
    console.log("register new user: ", this.form.value)
    const username = this.form.get("username").value
    const password = this.form.get("password").value
    const email = this.form.get("email").value

    this.userSvc.registerNewUser(username, password, email).then(resp => {
      if (resp){
        //get token 
        alert('New Account registered successfully! Please head to login page to login.')
        
      //navigate to portfolio
      //this.router.navigate(['/main'])
      }else{
        this.showErrorRegister = true
      }
      
    })

  }

  backToLogin(){
    this.register = !this.register
    this.form = this.createLoginForm()
    this.form.reset()
  }
  
    googleSignIn(){
      this.userSvc.signInWithGoogle()
    }

}
