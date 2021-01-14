import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { LoginComponent } from './components/login.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './components/main.component';
import { HttpClientModule } from '@angular/common/http'
import { UserService } from './user.service';
import { PortfolioService } from './portfolio.service';
import { AddCoinComponent } from './components/add-coin.component';
import { AccountComponent } from './components/account.component';

const ROUTES:Routes = [
  {path: '', component: LoginComponent},
  {path: 'account', component: AccountComponent, canActivate:[UserService]},
  {path: 'main', component: MainComponent, canActivate: [UserService]},
  {path: 'add', component: AddCoinComponent},
  {path: 'edit/:entryId', component: AddCoinComponent},
  {path: '**', redirectTo: '/', pathMatch: 'full'},
]

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainComponent,
    AddCoinComponent,
    AccountComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(ROUTES),
    HttpClientModule,
  ],
  providers: [ UserService, PortfolioService
],
  bootstrap: [AppComponent]
})
export class AppModule { }
