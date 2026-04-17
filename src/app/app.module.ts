import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';

import { LoginComponent } from './auth/login/login.component';

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserModule,
    FormsModule,
    LoginComponent
  ],
  providers: [provideHttpClient()],
})
export class AppModule { }
