import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../user.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit{
  username: ''
  email: ''
  constructor(private userSvc: UserService, private router: Router) { }

  ngOnInit(): void {
    this.userSvc.getUserDetails().then(resp =>{
      this.username = resp[0].username
      this.email = resp[0].email
    }

      )
  }

  logOut(){
    
    localStorage.clear()
    alert("Logged out successfully")
    this.router.navigate(['/'])
  }
}
