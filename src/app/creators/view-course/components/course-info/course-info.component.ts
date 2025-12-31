import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../api-service';
import { ToastService } from '../../../../toast.service';

@Component({
    selector: 'app-course-info',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './course-info.component.html'
})
export class CourseInfoComponent {
    @Input() course: any;
    @Input() loading: boolean = false;
    @Input() courseDirty: boolean = false;
    @Input() thumbnailPreview: string | null = null;
    @Output() courseChange = new EventEmitter<void>();
    @Output() save = new EventEmitter<void>();
    @Output() continue = new EventEmitter<void>();
    @Output() thumbnailUploaded = new EventEmitter<string>(); // Emits new preview URL
    @Output() validityChange = new EventEmitter<boolean>();

    thumbnailFile: File | null = null;
    uploadInProgress: boolean = false;
    uploadProgress: number = 0;
    showErrors: boolean = false;
    

    constructor(
        private api: ApiService,
        private toast: ToastService
    ) { }

    onCourseChange() {
    this.courseChange.emit();
    try { this.validityChange.emit(this.isValidCourse()); } catch (e) {}
    }

    // Validation: ensure required course fields are present
    isValidCourse(): boolean {
        if (!this.course) return false;
        const nameOk = !!(this.course.name && String(this.course.name).trim().length);
        const descOk = !!(this.course.description && String(this.course.description).trim().length);
        const thumbOk = !!(this.thumbnailPreview || (this.course.thumbnail && this.course.thumbnail.length));
        return nameOk && descOk && thumbOk;
    }

    attemptSave() {
        this.showErrors = true;
        this.validityChange.emit(this.isValidCourse());
        if (this.isValidCourse() && !this.loading && this.courseDirty) {
            this.saveCourse();
        }
    }

    attemptContinue() {
        this.showErrors = true;
        this.validityChange.emit(this.isValidCourse());
        if (this.isValidCourse()) {
            this.continue.emit();
        }
    }

    recalcPrice() {
        if (!this.course) return;
        this.course.price = Number(this.course.price) || 0;
        this.course.discount = Math.min(Math.max(Number(this.course.discount) || 0, 0), 100);
    }

    finalPrice() {
        return this.course.price * (1 - this.course.discount / 100);
    }

    onThumbnailChange(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.thumbnailFile = file;
            const reader = new FileReader();
            reader.onload = (e: any) => this.thumbnailPreview = e.target.result;
            reader.readAsDataURL(file);
            this.courseChange.emit();
            try { this.validityChange.emit(this.isValidCourse()); } catch (e) {}
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        try { this.validityChange.emit(this.isValidCourse()); } catch (e) {}
    }

    uploadThumbnail() {
        if (!this.course.id || !this.thumbnailFile) return;
        this.uploadInProgress = true;
        const fd = new FormData();
        fd.append('thumbnail', this.thumbnailFile);
        this.api.postMultipart(`/creator/v2/courses/${this.course.id}/thumbnail`, fd).subscribe({
            next: (res: any) => {
                this.course.thumbnail_url=res.path;
                this.uploadInProgress = false;
                this.toast.success('Thumbnail uploaded');
                // Assuming API returns the new thumbnail URL or we just keep the local preview
            },
            error: () => {
                this.uploadInProgress = false;
                this.toast.error('Upload failed');
            }
        });
    }

    saveCourse() {
        this.save.emit();
    }
}
