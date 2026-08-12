from rest_framework import serializers
from .models import (
    Category,
    Course,
    Lesson,
    Enrollment,
    PaymentRequest
)
from authentication.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    course_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'course_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_course_count(self, obj):
        return obj.courses.count()


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.get_full_name', read_only=True)
    instructor_details = UserSerializer(source='instructor', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    enrollment_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'category', 'category_name',
            'instructor', 'instructor_name', 'instructor_details',
            'thumbnail', 'difficulty', 'duration', 'price',
            'is_published', 'enrollment_count', 'is_enrolled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_enrollment_count(self, obj):
        return getattr(obj, 'annotated_enrollment_count', obj.enrollments.count())

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Enrollment.objects.filter(student=request.user, course=obj).exists()
        return False
    
    def validate(self, data):
        request = self.context.get('request')
        if request and request.method == 'POST':
            if request.user.role != 'instructor' and request.user.role != 'admin':
                raise serializers.ValidationError("Only instructors and admins can create courses")
        return data


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'title', 'description', 'category', 'thumbnail',
            'difficulty', 'duration', 'price', 'is_published'
        ]



class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id',
            'course',
            'title',
            'description',
            'video_url',
            'order',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_details = CourseSerializer(source='course', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_name', 'student_email',
            'course', 'course_title', 'course_details',
            'status', 'progress', 'enrolled_at', 'completed_at'
        ]
        read_only_fields = ['id', 'student', 'enrolled_at']
    
    def validate(self, data):
        request = self.context.get('request')

        print("========== PAYMENT DEBUG ==========")
        print("USER:", request.user if request else None)
        print("USER ID:", request.user.id if request else None)
        print("DATA:", data)
        print("COURSE:", data.get('course'))
        print("COURSE ID:", data.get('course').id if data.get('course') else None)
        print("===================================")

        if request and request.method == 'POST':
            student = data.get('student', request.user)
            course = data.get('course')

            print("DEBUG USER:", request.user)
            print("DEBUG USER ID:", request.user.id)
            print("DEBUG COURSE:", course)
            print("DEBUG COURSE ID:", course.id if course else None)
            
            if Enrollment.objects.filter(student=student, course=course).exists():
                raise serializers.ValidationError("Already enrolled in this course")
        
        return data


class DashboardStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_instructors = serializers.IntegerField()
    total_courses = serializers.IntegerField()
    total_enrollments = serializers.IntegerField()
    published_courses = serializers.IntegerField()
    active_enrollments = serializers.IntegerField()



class PaymentRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='student.get_full_name',
        read_only=True
    )

    course_title = serializers.CharField(
        source='course.title',
        read_only=True
    )

    class Meta:
        model = PaymentRequest
        fields = [
            'id',
            'student',
            'student_name',
            'course',
            'course_title',
            'name',
            'google_account_email',
            'bkash_number',
            'transaction_id',
            'payment_screenshot',
            'status',
            'rejection_reason',
            'enrollment_code',
            'code_used',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'student',
            'status',
            'rejection_reason',
            'enrollment_code',
            'code_used',
            'created_at',
            'updated_at',
        ]

    def validate(self, data):
        request = self.context.get('request')

        if request and request.method == 'POST':
            course = data.get('course')

            # Don't allow a student to submit another payment
            # request if already enrolled.
            if Enrollment.objects.filter(
                student=request.user,
                course=course
            ).exists():
                raise serializers.ValidationError(
                    "You are already enrolled in this course."
                )

            # Don't allow multiple pending requests
            # for the same student/course.
            if PaymentRequest.objects.filter(
                student=request.user,
                course=course,
                status='pending'
            ).exists():
                raise serializers.ValidationError(
                    "You already have a payment request pending "
                    "for this course."
                )

        return data