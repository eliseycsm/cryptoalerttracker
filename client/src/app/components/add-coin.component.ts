import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PortfolioService } from '../portfolio.service';
import { UserService } from '../user.service';
import * as cryptolist from './cryptolist.json'

@Component({
  selector: 'app-add-coin',
  templateUrl: './add-coin.component.html',
  styleUrls: ['./add-coin.component.css']
})
export class AddCoinComponent implements OnInit {
  form: FormGroup
  entryId: ''
  editMode: boolean = false
  username: string
  userId: string
  cryptos: any = (cryptolist as any).default
  today: Date = new Date()

  constructor(private fb: FormBuilder, private portfolioSvc: PortfolioService, 
    private router: Router, private userSvc: UserService, private activatedRoute: ActivatedRoute) { }

  ngOnInit(): void {

    this.entryId = this.activatedRoute.snapshot.params['entryId']
    this.username = this.userSvc.username
    this.userId = this.userSvc.userId

    this.form = this.fb.group({
      currency: this.fb.control('', [Validators.required]),
      date: this.fb.control('', [Validators.required]),
      units: this.fb.control('', [Validators.required]),
      boughtPrice: this.fb.control('', [Validators.required]),
      targetProfit: this.fb.control('', [Validators.required]),
      notify: this.fb.control('', [Validators.required])
    })

    if(this.entryId){
      this.editMode = true
      const entry = this.portfolioSvc.portfolioEntry
      this.form.patchValue(entry)
    }
  }

  async addCoin(){
    
    const {currency, date, units, boughtPrice, targetProfit, notify} = this.form.value
    const result = await this.portfolioSvc.addCoin(currency, date, units, boughtPrice, targetProfit, notify)
    if (result){
      alert("Coin successfully added to portfolio!")
      this.router.navigate(['/main'])
    }
  }

  async editEntry(){
    console.log("editentry form: ", this.form.value)
    const {currency, date, units, boughtPrice, targetProfit, notify} = this.form.value
    const result = await this.portfolioSvc.updateEntry(currency, date, units, boughtPrice, targetProfit, notify, this.entryId)
    if (true){
      alert("Entry successfully updated.")
      this.router.navigate(['/main'])

    }
  }

  async deleteEntry(){
    const reply = confirm("Are you sure you want to delete the entry?")
    if (reply){
      const userId = this.userId
      const entryId = this.entryId
      const result = await this.portfolioSvc.deleteEntry(userId, entryId)
      if(result){
        alert("entry deleted")
      }else{
        alert('Error deleting entry!')
      }
      this.router.navigate(['/main'])
    }
  }

}
