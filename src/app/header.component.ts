import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styles: [``]
})
export class HeaderComponent {
  menuOpen = false;
  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu() { this.menuOpen = false; }

  private router = inject(Router);

  navigateToSection(section: string) {
    const isHome = this.router.url === '/' || this.router.url === '/#' || this.router.url === '/#/';
    if (isHome) {
      // If already on home, just update the fragment to scroll
      window.location.hash = section;
    } else {
      this.router.navigate(['/'], { fragment: section });
    }
    this.closeMenu();
  }
}
