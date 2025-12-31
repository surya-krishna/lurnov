import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api-service';
import { ModalService } from '../../modal.service';
import { TestManagerComponent } from '../view-course/components/test-manager/test-manager.component';
import { CourseInfoComponent } from '../view-course/components/course-info/course-info.component';
import { SubjectManagerComponent } from '../view-course/components/subject-manager/subject-manager.component';
import { ChapterManagerComponent } from '../view-course/components/chapter-manager/chapter-manager.component';
import { PackageManagerComponent } from '../view-course/components/package-manager/package-manager.component';

@Component({
  selector: 'app-new-course',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TestManagerComponent,
    CourseInfoComponent,
    SubjectManagerComponent,
    ChapterManagerComponent,
    PackageManagerComponent
  ],
  templateUrl: './new-course.component.html',
  styleUrls: ['./new-course.component.scss']
})
export class NewCourseComponent {
  @ViewChild(CourseInfoComponent) courseInfoComponent!: CourseInfoComponent;

  maxUnits = 100; // configurable by admin later
  actionMessage: string | null = null;
  loading: boolean = false; // global loader for actions

  // wizard step: 1 = course, 2 = subjects, 3 = chapters, 4 = tests, 5 = packages
  step: number = 1;
  createdCourseId: string | null = null;
  course: any = { name: '', description: '', subjects: [] }; // Removed pricing details
  courseDirty: boolean = false;
  showSidebar: boolean = false;

  // Test manager state
  tests: any[] = [];
  selectedTestId: string | null = null;
  testAction: 'edit' | 'create' | 'auto' | null = null;
  showNewTestOptions: boolean = false;

  // Packages state
  packages: any[] = [];

  constructor(private api: ApiService, private modal: ModalService) { }
  private _prevMainMinHeight: string | null = null;

  ngOnInit() {
    try {
      const main = document.querySelector('main') as HTMLElement | null;
      if (main) { this._prevMainMinHeight = main.style.minHeight || null; main.style.minHeight = 'auto'; }
    } catch (e) { }
  }

  ngOnDestroy() {
    try {
      const main = document.querySelector('main') as HTMLElement | null;
      if (main && this._prevMainMinHeight !== null) { main.style.minHeight = this._prevMainMinHeight; }
    } catch (e) { }
  }

  toggleSidebar() { this.showSidebar = !this.showSidebar; }

  countUnits() {
    let count = 0;
    if (this.course.subjects) {
      for (const s of this.course.subjects) {
        count += (s.chapters?.length || 0);
      }
    }
    return count;
  }

  // Wizard: create course on server
  createCourse() {
    this.loading = true;
    this.actionMessage = 'Creating course...';
    // Ensure we don't send pricing if it's not needed, or send 0
    const payload: any = {
      name: this.course.name,
      title: this.course.name,
      description: this.course.description,
      status: 'draft'
    };

    this.api.post('/creator/v2/courses', payload).subscribe({
      next: (res: any) => {
        this.createdCourseId = res?.id;
        this.course.id = this.createdCourseId; // Update local course with ID
        this.courseDirty = false;

        // Upload thumbnail if present in child component
        if (this.courseInfoComponent && this.courseInfoComponent.thumbnailFile && this.createdCourseId) {
          const fd = new FormData();
          fd.append('thumbnail', this.courseInfoComponent.thumbnailFile);
          this.actionMessage = 'Course created — uploading thumbnail...';
          this.api.postMultipart('/creator/v2/courses/' + this.createdCourseId + '/thumbnail', fd).subscribe({
            next: () => {
              this.actionMessage = 'Course created';
              this.loading = false;
              setTimeout(() => this.actionMessage = null, 2000);
              this.nextStep();
            },
            error: (err: any) => {
              console.error('Thumbnail upload failed', err);
              this.actionMessage = 'Course created (thumbnail upload failed)';
              this.loading = false;
              setTimeout(() => this.actionMessage = null, 3000);
              this.nextStep();
            }
          });
        } else {
          this.actionMessage = 'Course created';
          this.loading = false;
          setTimeout(() => this.actionMessage = null, 2000);
          this.nextStep();
        }
      },
      error: (err: any) => {
        console.error('Create course failed', err);
        this.actionMessage = 'Failed to create course';
        this.loading = false;
        setTimeout(() => this.actionMessage = null, 3000);
      }
    });
  }

  // Subject Manager Handlers
  onSubjectsSave() {
    this.createAllSubjects();
  }

  async createAllSubjects() {
    if (!this.course.subjects || this.course.subjects.length === 0) {
      this.actionMessage = 'No subjects to create';
      setTimeout(() => this.actionMessage = null, 2000);
      return;
    }
    this.loading = true;
    this.actionMessage = 'Creating all subjects...';

    try {
      if (!this.createdCourseId) {
        this.actionMessage = 'Please save the course before saving subjects';
        this.loading = false;
        setTimeout(() => this.actionMessage = null, 3000);
        return;
      }

      const payload = this.course.subjects.map((s: any) => ({
        id: s.id,
        name: s.name,
        language: s.language
      }));

      const res: any = await new Promise((resolve, reject) => {
        this.api.post(`/creator/v2/courses/${this.createdCourseId}/books/bulk`, payload).subscribe({
          next: (r) => resolve(r),
          error: (e) => reject(e)
        });
      });

      // Update local subjects with IDs from response if needed
      // The response structure is { created: [{id, name, language}], updated: [...] }
      // We can try to map back IDs to our local subjects based on name or order if needed.
      // For now, let's assume the user will continue and we might reload or just trust the flow.
      // If we need IDs for the next step (Chapters), we MUST update them.

      // Simple mapping strategy:
      // If we sent N subjects and got M created/updated, we should try to match them.
      // Since the bulk API might not return them in same order (though usually it does or we can infer),
      // let's try to match by name for now as a fallback, or just reload the course structure?
      // Reloading is safer to get the generated IDs.

      // Let's reload the course subjects to get IDs
      await this.reloadCourseSubjects();

      this.actionMessage = 'Subjects processed';
      setTimeout(() => this.actionMessage = null, 2000);
    } catch (err: any) {
      console.error('Subject creation error', err);
      this.actionMessage = 'Error processing subjects';
    } finally {
      this.loading = false;
    }
  }

  // Helper to reload subjects to get IDs
  async reloadCourseSubjects() {
    if (!this.createdCourseId) return;
    try {
      const res: any = await new Promise((resolve, reject) => {
        this.api.get(`/creator/v2/courses/${this.createdCourseId}`).subscribe({
          next: (r) => resolve(r),
          error: (e) => reject(e)
        });
      });

      if (res && (res.subjects || res.books)) {
        // We need to preserve the local state if possible, but we need IDs.
        // Let's map IDs from fetched subjects to local subjects by matching names.
        const fetchedSubjects = res.subjects || res.books || [];

        this.course.subjects.forEach((localSubj: any) => {
          const match = fetchedSubjects.find((fs: any) => fs.name === localSubj.name || fs.Name === localSubj.name);
          if (match) {
            localSubj.id = match.id || match._id;
          }
        });
      }
    } catch (e) {
      console.error('Failed to reload course subjects', e);
    }
  }

  onSubjectsContinue() {
    this.createAllSubjects().then(() => {
      this.nextStep();
    });
  }

  // Chapter Manager Handlers
  onChaptersSave() {
    this.saveAllChapters();
  }

  async saveAllChapters() {
    if (!this.course?.subjects?.length) {
      this.actionMessage = 'No subjects to process';
      setTimeout(() => this.actionMessage = null, 2000);
      return;
    }
    this.loading = true;
    this.actionMessage = 'Saving chapters...';

    try {
      const promises = this.course.subjects.map((subj: any) => {
        if (!subj || !subj.id) return Promise.resolve(); // Skip if subject not saved

        const payload = (subj.chapters || []).map((ch: any, index: number) => ({
          id: ch.id,
          name: ch.name,
          youtube: ch.Url || ch.youtube || '',
          description: ch.description,
          thumbnail_url: ch.thumbnail_url,
          duration_seconds: ch.duration_seconds,
          order: index
        }));

        return new Promise((resolve, reject) => {
          this.api.post(`/creator/v2/books/${subj.id}/chapters/bulk`, payload).subscribe({
            next: (r) => resolve(r),
            error: (e) => reject(e)
          });
        });
      });

      await Promise.all(promises);

      this.actionMessage = 'Chapters saved';
      setTimeout(() => this.actionMessage = null, 2000);
    } catch (e) {
      console.error('Chapter save error', e);
      this.actionMessage = 'Error saving chapters';
    } finally {
      this.loading = false;
    }
  }

  onChaptersContinue() {
    this.saveAllChapters().then(() => {
      this.nextStep();
    });
  }

  nextStep() { if (this.step < 5) this.step++; } // Increased to 5 for packages
  prevStep() { if (this.step > 1) this.step--; }

  setStep(n: number) {
    this.step = n;
    if (this.step === 4) {
      this.loadTests();
    }
  }

  // Test manager methods
  loadTests() {
    if (!this.createdCourseId) return;
    this.api.get(`/creator/v2/courses/${this.createdCourseId}/tests`).subscribe({
      next: (res: any) => { this.tests = res || []; },
      error: () => { this.actionMessage = 'Failed to load tests'; setTimeout(() => this.actionMessage = null, 3000); }
    });
  }

  selectTest(id: string) { this.selectedTestId = id; this.testAction = 'edit'; }
  createNewTest() { this.selectedTestId = null; this.testAction = 'create'; this.showNewTestOptions = false; }
  openAutoGenerate() { this.selectedTestId = null; this.testAction = 'auto'; this.showNewTestOptions = false; }

  deleteTest(index: number) {
    const test = this.tests[index];
    if (!test || !test.id) return;
    this.modal.confirm('Delete this test?').then(confirmed => {
      if (!confirmed) return;
      this.api.delete(`/creator/v2/courses/${this.createdCourseId}/tests/${test.id}`).subscribe({
        next: () => { this.tests.splice(index, 1); if (this.selectedTestId === test.id) { this.selectedTestId = null; this.testAction = null; } this.actionMessage = 'Test deleted'; setTimeout(() => this.actionMessage = null, 2000); },
        error: () => { this.actionMessage = 'Failed to delete test'; setTimeout(() => this.actionMessage = null, 3000); }
      });
    });
  }

  // Final submit
  async submitAll() {
    this.actionMessage = 'All done — course published as draft. You can now review or publish in the dashboard.';
    setTimeout(() => this.actionMessage = null, 4000);
    // Optionally navigate away
  }

  onCourseChange() {
    this.courseDirty = true;
  }
}
