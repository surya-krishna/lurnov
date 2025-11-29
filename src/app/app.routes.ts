import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { BlogComponent } from './blog.component';
import { AboutComponent } from './about.component';
import { ContactComponent } from './contact.component';
import { BlogPostComponent } from './blog-post.component';
import { DeleteAccountComponent } from './delete-account.component';
import { TermsConditionsComponent } from './terms-conditions.component';
import { RefundPolicyComponent } from './refund-policy.component';
import { PrivacyPolicyComponent } from './privacy-policy.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'blog/:id', component: BlogPostComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  {
    path: 'delete-account-request',
    component: DeleteAccountComponent
  },
  { path: 'terms-conditions', component: TermsConditionsComponent },
  { path: 'refund-policy', component: RefundPolicyComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
];
