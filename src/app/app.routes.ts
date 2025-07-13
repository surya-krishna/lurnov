import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { BlogComponent } from './blog.component';
import { AboutComponent } from './about.component';
import { ContactComponent } from './contact.component';
import { BlogPostComponent } from './blog-post.component';
import { DeleteAccountComponent } from './delete-account.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'blog/:id', component: BlogPostComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  {
    path: 'delete-account-request',
    component: DeleteAccountComponent
  },
];
