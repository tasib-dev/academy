from django.db import models
from authentication.models import User
import uuid
import string
import secrets

class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Course(models.Model):
    DIFFICULTY_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='courses')
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='taught_courses', limit_choices_to={'role': 'instructor'})
    thumbnail = models.ImageField(upload_to='course_thumbnails/', blank=True, null=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    duration = models.IntegerField(help_text='Duration in hours', default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_published = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'courses'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    @property
    def enrollment_count(self):
        return self.enrollments.count()


class Lesson(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='lessons'
    )

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, null=True)

    video_url = models.URLField(blank=True, null=True)

    order = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lessons'
        ordering = ['order']

    def __str__(self):
        return f"Lesson {self.order}: {self.title}"


class Enrollment(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments', limit_choices_to={'role': 'student'})
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    progress = models.IntegerField(default=0, help_text='Progress percentage')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'enrollments'
        unique_together = ('student', 'course')
        ordering = ['-enrolled_at']
    
    def __str__(self):
        return f"{self.student.email} - {self.course.title}"




def generate_enrollment_code():
    while True:
        uppercase = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(4))
        lowercase = ''.join(secrets.choice(string.ascii_lowercase) for _ in range(4))
        numbers = ''.join(secrets.choice(string.digits) for _ in range(4))

        code = uppercase + lowercase + numbers

        # Shuffle the characters so the pattern isn't predictable
        code_list = list(code)
        secrets.SystemRandom().shuffle(code_list)
        code = ''.join(code_list)

        # Make sure this code doesn't already exist
        if not PaymentRequest.objects.filter(enrollment_code=code).exists():
            return code
class PaymentRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_requests'
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='payment_requests'
    )

    name = models.CharField(max_length=200)

    google_account_email = models.EmailField()

    bkash_number = models.CharField(max_length=20)

    transaction_id = models.CharField(max_length=100)

    payment_screenshot = models.ImageField(
        upload_to='payment_screenshots/',
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True
    )

    enrollment_code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True
    )

    code_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_requests'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.enrollment_code:
            self.enrollment_code = generate_enrollment_code()

        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.name} - {self.course.title} - {self.status}"    