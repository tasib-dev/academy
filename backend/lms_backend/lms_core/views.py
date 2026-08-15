from rest_framework import status, generics, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.db.models import Count, Q
from django.core.mail import send_mail
from django.conf import settings
import threading
import os
import resend

from .models import Category, Course, Lesson, Enrollment, PaymentRequest
from authentication.models import User
from .serializers import (
    CategorySerializer,
    CourseSerializer,
    CourseCreateUpdateSerializer,
    LessonSerializer,
    EnrollmentSerializer,
    PaymentRequestSerializer,
    DashboardStatsSerializer
)
from .permissions import IsAdminOrInstructor, IsAdmin, IsStudent, IsOwnerOrAdmin


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated, IsAdminOrInstructor]
        return [permission() for permission in permission_classes]


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CourseCreateUpdateSerializer
        return CourseSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        elif self.action in ['create']:
            permission_classes = [IsAuthenticated, IsAdminOrInstructor]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        queryset = Course.objects.select_related('instructor', 'category').annotate(
            annotated_enrollment_count=Count('enrollments')
        )

        if self.request.user.is_authenticated and self.request.user.role == 'admin':
            return queryset

        q_filter = Q(is_published=True)

        if self.request.user.is_authenticated and self.request.user.role == 'instructor':
            q_filter |= Q(instructor=self.request.user)
            
        return queryset.filter(q_filter)
    
    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_courses(self, request):
        if request.user.role == 'instructor':
            courses = Course.objects.filter(instructor=request.user).annotate(
                annotated_enrollment_count=Count('enrollments')
            )
        elif request.user.role == 'student':
            enrollments = Enrollment.objects.filter(student=request.user)
            courses = Course.objects.filter(enrollments__in=enrollments).annotate(
                annotated_enrollment_count=Count('enrollments')
            )
        else:
            courses = Course.objects.none()
        
        serializer = self.get_serializer(courses, many=True)
        return Response(serializer.data)



import uuid

class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated, IsAdminOrInstructor]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Lesson.objects.select_related('course').order_by(
            'course', 'order'
        )

        course_id = self.request.query_params.get('course')

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        user = self.request.user

        # Admins and instructors can access lessons
        if user.is_authenticated and user.role in ['admin', 'instructor']:
            return queryset

        # Students can only access lessons from courses
        # they are enrolled in
        if user.is_authenticated and user.role == 'student':
            queryset = queryset.filter(
                course__enrollments__student=user,
                course__enrollments__status='active'
            )
            return queryset

        return Lesson.objects.none()

    def get_object(self):
        queryset = self.get_queryset()

        pk = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)

        try:
            pk = uuid.UUID(pk)
        except (ValueError, TypeError, AttributeError):
            from rest_framework.exceptions import NotFound
            raise NotFound('Invalid lesson ID.')

        return queryset.get(pk=pk)



class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Enrollment.objects.select_related('student', 'course', 'course__instructor')
        
        if self.request.user.role == 'student':
            queryset = queryset.filter(student=self.request.user)
        elif self.request.user.role == 'instructor':
            queryset = queryset.filter(course__instructor=self.request.user)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


def send_payment_notification(payment_request):
    try:
        resend.api_key = os.environ.get('RESEND_API_KEY')

        params = {
            'from': 'onboarding@resend.dev',
            'to': [os.environ.get('ADMIN_EMAIL')],
            'subject': '🔔 New Payment Request - LMS',
            'html': f"""
                <h2>🔔 New Payment Request - LMS</h2>

                <p>A new payment request has been submitted.</p>

                <p>
                    <strong>Student Name:</strong><br>
                    {payment_request.name}
                </p>

                <p>
                    <strong>Student Email:</strong><br>
                    {payment_request.google_account_email}
                </p>

                <p>
                    <strong>Course:</strong><br>
                    {payment_request.course.title}
                </p>

                <p>
                    <strong>bKash Number:</strong><br>
                    {payment_request.bkash_number}
                </p>

                <p>
                    <strong>Transaction ID:</strong><br>
                    {payment_request.transaction_id}
                </p>

                <p>
                    <strong>Status:</strong><br>
                    {payment_request.status}
                </p>

                <p>
                    <strong>Submitted At:</strong><br>
                    {payment_request.created_at}
                </p>

                <p>
                    Please log in to the Django Admin Panel to review this payment request.
                </p>
            """,
        }

        response = resend.Emails.send(params)

        print(
            f"Payment notification email sent successfully: {response}"
        )

    except Exception as e:
        print(
            f"Payment notification email failed: {e}"
        )



class PaymentRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PaymentRequest.objects.select_related(
            'student',
            'course'
        )

        if self.request.user.role == 'admin':
            return queryset

        if self.request.user.role == 'student':
            return queryset.filter(student=self.request.user)

        return PaymentRequest.objects.none()

    def perform_create(self, serializer):
        payment_request = serializer.save(
            student=self.request.user
        )

        send_payment_notification(payment_request)


    @action(
        detail=False,
        methods=['post'],
        url_path='verify-code',
        permission_classes=[IsAuthenticated]
    )
    def verify_code(self, request):
        code = request.data.get('code')
        course_id = request.data.get('course')

        if not code:
            return Response(
                {'detail': 'Enrollment code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not course_id:
            return Response(
                {'detail': 'Course is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment_request = PaymentRequest.objects.get(
                enrollment_code=code,
                course_id=course_id,
                student=request.user
            )

        except PaymentRequest.DoesNotExist:
            return Response(
                {'detail': 'Invalid enrollment code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check payment approval
        if payment_request.status != 'approved':
            return Response(
                {
                    'detail':
                    'This payment request has not been approved yet.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check whether code was already used
        if payment_request.code_used:
            return Response(
                {
                    'detail':
                    'This enrollment code has already been used.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already enrolled
        if Enrollment.objects.filter(
            student=request.user,
            course_id=course_id
        ).exists():
            return Response(
                {
                    'detail':
                    'You are already enrolled in this course.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create enrollment
        enrollment = Enrollment.objects.create(
            student=request.user,
            course_id=course_id,
            status='active'
        )

        # Mark code as used
        payment_request.code_used = True
        payment_request.save(
            update_fields=['code_used', 'updated_at']
        )

        return Response(
            {
                'message': 'Enrollment successful!',
                'enrollment_id': str(enrollment.id)
            },
            status=status.HTTP_200_OK
        )



class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        stats = {
            'total_users': User.objects.count(),
            'total_students': User.objects.filter(role='student').count(),
            'total_instructors': User.objects.filter(role='instructor').count(),
            'total_courses': Course.objects.count(),
            'total_enrollments': Enrollment.objects.count(),
            'published_courses': Course.objects.filter(is_published=True).count(),
            'active_enrollments': Enrollment.objects.filter(status='active').count(),
        }
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EnrollmentReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        enrollments = Enrollment.objects.select_related(
            'student', 'course', 'course__instructor'
        ).order_by('-enrolled_at')
        
        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CourseReportView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrInstructor]
    
    def get(self, request):
        courses = Course.objects.select_related('instructor', 'category').annotate(
            annotated_enrollment_count=Count('enrollments')
        ).order_by('-created_at')
        
        if request.user.role == 'instructor':
            courses = courses.filter(instructor=request.user)
        
        serializer = CourseSerializer(courses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)