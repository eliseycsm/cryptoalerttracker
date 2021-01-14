import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Coin } from '../models';
import { PortfolioService } from '../portfolio.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  username: string =''
  userId: string
  coins: Coin[] = []
  
  constructor(private activatedRoute: ActivatedRoute, private portfolioSvc: PortfolioService,
    private router: Router, private userSvc: UserService) { }

  ngOnInit(): void {
    //this.username = this.activatedRoute.snapshot.params['username']
    //this.userId = this.activatedRoute.snapshot.params['user_id']
    this.username = this.userSvc.username
    this.userId = this.userSvc.userId
    

    this.portfolioSvc.getList(this.userId).then(res => {
    
      const arr = res[0].portfolio
      for (let data of arr){
    
        let coin = {
          entryId: data.entryId,
          name: data.name, 
          currency: data.currency,
          date: data.dateBought, 
          units: data.units,
          boughtPrice: data.boughtPrice,
          targetProfit: data.targetProfit,
          notify: data.notify
        } as Coin
        
        this.coins.push(coin)
        
      }
    })
  }

  selectEntry(entryId){
    
    const entry = this.coins.find(e => e.entryId == entryId)
    this.portfolioSvc.portfolioEntry = entry
    this.router.navigate(['/edit', entryId])
  }
}
