import { Component, AfterViewInit, OnInit, ChangeDetectorRef, NgZone} from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { ElementRef, ViewChild } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [FormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App implements AfterViewInit, OnInit {

weeklyChart: any;
projectChart: any;

employerLeaveChart: any;
employerProjectChart: any;

constructor(
  private http: HttpClient,
  private cdr: ChangeDetectorRef,
  private zone: NgZone
) {}

@ViewChild('heroVideo') heroVideo!: ElementRef<HTMLVideoElement>;

isSavingEmployeeProfile = false;
isSavingEmployerProfile = false;

isUpdatingEmployeePassword = false;
isUpdatingEmployerPassword = false;

ngOnInit() {
}

loadTasks() {
  this.http.get<any[]>('http://localhost:3000/tasks').subscribe({
    
    next: (data) => {
      console.log(data);
      this.tasks = data.map(task => ({
        id: task.id,
        employeeId: task.employee_id,
        employeeName: task.employee_name,
        startTime: task.start_time.substring(0, 5),
        endTime: task.end_time.substring(0, 5),
        date: task.task_date.split('T')[0],
        task: task.task_name,
        project: task.project_name,
        description: task.description,
        status: task.status || 'Pending',
        priority: task.priority,
        reviewComment: task.review_comment,
        reviewed_at: task.reviewed_at
      }));
    },
    error: (err) => {
      console.error('Error loading tasks:', err);
    }
  });
}

loadEmployerCharts() {
  const leaveCanvas = document.getElementById('employerLeaveChart') as HTMLCanvasElement;
  const projectCanvas = document.getElementById('employerProjectChart') as HTMLCanvasElement;

  if (!leaveCanvas || !projectCanvas) {
    return;
  }

  if (this.employerLeaveChart) {
    this.employerLeaveChart.destroy();
  }

  if (this.employerProjectChart) {
    this.employerProjectChart.destroy();
  }

  const pending = this.leaves.filter(leave => leave.status === 'Pending').length;
  const approved = this.leaves.filter(leave => leave.status === 'Approved').length;
  const rejected = this.leaves.filter(leave => leave.status === 'Rejected').length;

  const projectCounts: any = {};

  this.tasks.forEach(task => {
    projectCounts[task.project] = (projectCounts[task.project] || 0) + 1;
  });

  this.employerLeaveChart = new Chart(leaveCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Approved', 'Rejected'],
      datasets: [{
        data: [pending, approved, rejected],
        backgroundColor: ['#f59e0b', '#2563eb', '#dc2626']
      }]
    }
  });

  this.employerProjectChart = new Chart(projectCanvas, {
    type: 'bar',
    data: {
      labels: Object.keys(projectCounts),
      datasets: [{
        label: 'Work Logs',
        data: Object.values(projectCounts),
        backgroundColor: '#2563eb'
      }]
    }
  });
}

ngAfterViewInit() {
  setTimeout(() => {
    this.loadDashboardCharts();
  }, 100);
}

showDashboard() {
  this.dashboardTab = 'dashboard';

  setTimeout(() => {
    this.loadDashboardCharts();
  }, 100);
}

loadDashboardCharts() {
  const weeklyCanvas = document.getElementById('weeklyHoursChart') as HTMLCanvasElement;
  const projectCanvas = document.getElementById('projectChart') as HTMLCanvasElement;

  if (!weeklyCanvas || !projectCanvas) {
    return;
  }

  if (this.weeklyChart) {
    this.weeklyChart.destroy();
  }

  if (this.projectChart) {
    this.projectChart.destroy();
  }

  this.weeklyChart = new Chart(weeklyCanvas, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      datasets: [{
        label: 'Hours Worked',
        data: [6, 8, 5, 7, 8],
        backgroundColor: '#09af2d'
      }]
    }
  });

  this.projectChart = new Chart(projectCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Time Logging System', 'Employee Portal', 'HR App'],
      datasets: [{
        data: [45, 30, 25],
        backgroundColor: ['#09af2d', '#4caf50', '#8bc34a']
      }]
    }
  });
}
  page = 'home';
  dashboardTab = 'dashboard';
  showTaskModal = false;

  newTask = {
    startTime: '',
    endTime: '',
    date: '',
    task: '',
    project: '',
    description: ''
  };

  tasks: {
  id: number;
  employeeId: number;
  employeeName: string;
  startTime: string;
  endTime: string;
  date: string;
  task: string;
  project: string;
  description: string;
  priority?: string;
  status?: string;
  reviewComment?:string;
  reviewed_at?: string;
}[] = [];

  selectedProject = 'All';

  get projects() {
  return ['All', ...new Set(this.tasks.map(task => task.project))];
  }

goToLogin(role: string) {
  this.selectedRole = role;
  this.page = 'login';

  this.loginEmail = '';
  this.loginPassword = '';
  this.loginError = '';
}

  goToHome() {
  this.page = 'home';

  setTimeout(() => {
    const video = this.heroVideo?.nativeElement;
    if (video) {
      video.muted = true;
      video.play().catch(err => {
        console.log('Video autoplay blocked:', err);
      });
    }
  }, 100);
}

ngAfterViewChecked() {
  if (this.page === 'home') {
    const video = this.heroVideo?.nativeElement;
    if (video && video.paused) {
      video.muted = true;
      video.play().catch(() => {});
    }
  }
}

refreshEmployeeDashboard() {
  this.loadEmployeeTasks();
  this.loadEmployeeLeaves();

  setTimeout(() => {
    this.loadDashboardCharts();
    this.cdr.detectChanges();
  }, 400);
}

refreshEmployerDashboard() {
  this.loadTasks();
  this.loadLeaves();
  this.loadEmployees();

  setTimeout(() => {
    this.loadEmployerCharts();
    this.cdr.detectChanges();
  }, 400);
}

  goToEmployeeDashboard() {
  this.page = 'employee-dashboard';
  this.dashboardTab = 'dashboard';
  this.reviewNotification = {
  task_name: 'Test Task',
  review_comment: 'This is a test review.',
  priority: 'Medium',
  reviewed_at: new Date()
};

this.showReviewNotification = true;

  setTimeout(() => {
    this.loadDashboardCharts();
  }, 100);
  }

  showWorkLog() {
    this.dashboardTab = 'worklog';
    this.loadEmployeeTasks();
  }

  openTaskModal() {
    this.showTaskModal = true;
  }

  closeTaskModal() {
    this.showTaskModal = false;
  }

saveTask() {
  const payload = {
    employee_id: this.currentUser.id,
    task_name: this.newTask.task,
    project_name: this.newTask.project,
    description: this.newTask.description,
    start_time: this.newTask.startTime,
    end_time: this.newTask.endTime,
    task_date: this.newTask.date
  };

  if (this.editingTask) {
    this.http.put(`http://localhost:3000/tasks/${this.editingTask.id}`, payload).subscribe({
      next: () => {
        this.loadEmployeeTasks();
        this.resetTaskForm();
      },
      error: (err) => console.error('Error updating task:', err)
    });
  } else {
    this.http.post('http://localhost:3000/tasks', payload).subscribe({
      next: () => {
        this.loadEmployeeTasks();
        this.resetTaskForm();
      },
      error: (err) => console.error('Error saving task:', err)
    });
  }
}

resetTaskForm() {
  this.newTask = {
    startTime: '',
    endTime: '',
    date: '',
    task: '',
    project: '',
    description: ''
  };

  this.editingTask = null;
  this.showTaskModal = false;
}

editingTask: any = null;

editTask(task: any) {
  this.editingTask = task;

  this.newTask = {
    startTime: task.startTime,
    endTime: task.endTime,
    date: task.date,
    task: task.task,
    project: task.project,
    description: task.description
  };

  this.showTaskModal = true;
}

deleteTask(task: any) {
  this.http.delete(`http://localhost:3000/tasks/${task.id}`).subscribe({
    next: () => {
      this.loadEmployeeTasks();
    },
    error: (err) => {
      console.error('Error deleting task:', err);
    }
  });
}

loadLeaves() {
  this.http.get<any[]>('http://localhost:3000/leaves').subscribe({
    next: (data) => {
      this.leaves = data.map(leave => ({
  id: leave.id,
  employeeId: leave.employee_id,
  employeeName: leave.employee_name,
  type: leave.leave_type,
  fromDate: leave.from_date.split('T')[0],
  toDate: leave.to_date.split('T')[0],
  days: leave.days,
  reason: leave.reason,
  status: leave.status,
  rejectionReason: leave.rejection_reason
}));
    },
    error: (err) => {
      console.error('Error loading leaves:', err);
    }
  });
}

showLeaves() {
  this.dashboardTab = 'leaves';
  this.loadEmployeeLeaves();
  this.checkLeaveNotification();
}

showLeaveModal = false;

newLeave = {
  type: '',
  fromDate: '',
  toDate: '',
  reason: '',
  status: 'Pending'
};

leaves: {
  id: number;
  employeeId: number;
  employeeName: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  rejectionReason?: string;
}[] = [];

openLeaveModal() {
  this.showLeaveModal = true;
}

closeLeaveModal() {
  this.showLeaveModal = false;
}

saveLeave() {
  const from = new Date(this.newLeave.fromDate);
  const to = new Date(this.newLeave.toDate);

  const days =
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const payload = {
    employee_id: this.currentUser.id,
    leave_type: this.newLeave.type,
    from_date: this.newLeave.fromDate,
    to_date: this.newLeave.toDate,
    days: days,
    reason: this.newLeave.reason
  };

  this.http.post('http://localhost:3000/leaves', payload).subscribe({
    next: () => {
      this.loadEmployeeLeaves();

      this.newLeave = {
        type: '',
        fromDate: '',
        toDate: '',
        reason: '',
        status: 'Pending'
      };

      this.showLeaveModal = false;
    },
    error: (err) => {
      console.error('Error saving leave:', err);
    }
  });
}
totalLeaves = 16;

get pendingLeaves() {
  return this.leaves.filter(leave => leave.status === 'Pending').length;
}

get rejectedLeaves() {
  return this.leaves.filter(leave => leave.status === 'Rejected').length;
}

get usedLeaves() {
  return this.leaves
    .filter(leave => leave.status === 'Approved')
    .reduce((total, leave) => total + leave.days, 0);
}

get availableLeaves() {
  return this.totalLeaves - this.usedLeaves;
}

showProfile() {
  this.dashboardTab = 'profile';
}

profileTab = 'personal';

showPersonalInfo() {
  this.profileTab = 'personal';
}

showLoginPassword() {
  this.profileTab = 'password';
}

goToEmployerDashboard() {
  this.page = 'employer-dashboard';
  this.employerTab = 'dashboard';

  setTimeout(() => {
    this.loadEmployerCharts();
  }, 100);
}

employerTab = 'dashboard';

showEmployerDashboard() {
  this.employerTab = 'dashboard';

  this.loadTasks();
  this.loadLeaves();

  setTimeout(() => {
    this.loadEmployerCharts();
  }, 100);
}

showEmployerEmployees() {
  this.employerTab = 'employees';
}

showAddEmployeeModal = false;

newEmployee = {
  name: '',
  role: '',
  department: '',
  email: '',
  password: '',
  phone: '',
  hiredDate: '',
  verified: false
};

employees = [
  {
    id: 1,
    name: 'Pratheek',
    role: 'Software Developer',
    department: 'Development',
    email: 'pratheek@gmail.com',
    phone: '+91 9876543210',
    hiredDate: '2026-06-18',
    verified: true
  },
  { 
    id: 2,
    name: 'Aman',
    role: 'UI Designer',
    department: 'Design',
    email: 'aman@gmail.com',
    phone: '+91 9876500000',
    hiredDate: '2026-06-19',
    verified: false
  }
];

openAddEmployeeModal() {
  this.editingEmployee = null;
  this.showCredentialsModal = false;

  this.newEmployee = {
    name: '',
    role: '',
    department: '',
    email: '',
    password: '',
    phone: '',
    hiredDate: '',
    verified: false
  };

  this.showAddEmployeeModal = true;
}

closeAddEmployeeModal() {
  this.isSavingEmployee = false;
  this.resetEmployeeForm();
}

saveEmployee() {
  if (this.isSavingEmployee) {
    return;
  }

  this.isSavingEmployee = true;

  const payload = {
    name: this.newEmployee.name,
    designation: this.newEmployee.role,
    department: this.newEmployee.department,
    phone: this.newEmployee.phone,
    hired_date: this.newEmployee.hiredDate
  };

  if (this.editingEmployee) {
    this.http.put(
      `http://localhost:3000/employees/${this.editingEmployee.id}`,
      payload
    ).subscribe({
      next: () => {
        this.zone.run(() => {
          this.isSavingEmployee = false;
          this.loadEmployees();
          this.resetEmployeeForm();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error updating employee:', err);
        this.zone.run(() => {
          this.isSavingEmployee = false;
          this.cdr.detectChanges();
        });
      }
    });

    return;
  }

  this.http.post<any>('http://localhost:3000/employees', payload).subscribe({
    next: (response) => {
      console.log('Employee saved response:', response);

      this.zone.run(() => {
        this.generatedCredentials = {
          employeeCode: response.employee_code,
          email: response.email,
          tempPassword: response.tempPassword
        };

        this.isSavingEmployee = false;
        this.showAddEmployeeModal = false;
        this.showCredentialsModal = true;

        this.loadEmployees();
        this.cdr.detectChanges();
      });
    },
    error: (err) => {
      console.error('Error saving employee:', err);

      this.zone.run(() => {
        this.isSavingEmployee = false;
        this.showAddEmployeeModal = true;
        this.cdr.detectChanges();
      });
    }
  });
}
showEmployerWorkLogs() {
  this.employerTab = 'worklogs';
}

showEmployerLeaveRequests() {
  this.employerTab = 'leave-requests';
}

approveLeave(leave: any) {
  this.http.put(`http://localhost:3000/leaves/${leave.id}/approve`, {})
    .subscribe({
      next: (updatedLeave: any) => {
        leave.status = updatedLeave.status;
        this.loadLeaves();
      },
      error: (err) => {
        console.error('Error approving leave:', err);
      }
    });
}

openRejectModal(leave: any) {

  this.selectedLeave = leave;

  this.rejectionReason = '';

  this.showRejectModal = true;
}

confirmReject() {
  if (!this.selectedLeave) return;

  this.http.put(
    `http://localhost:3000/leaves/${this.selectedLeave.id}/reject`,
    { rejection_reason: this.rejectionReason }
  ).subscribe({
    next: (updatedLeave: any) => {
      this.selectedLeave.status = updatedLeave.status;
      this.selectedLeave.rejectionReason = updatedLeave.rejection_reason;

      this.showRejectModal = false;
      this.selectedLeave = null;
      this.rejectionReason = '';

      this.loadLeaves();
    },
    error: (err) => {
      console.error('Error rejecting leave:', err);
    }
  });
}

checkLeaveNotification() {
  if (!this.currentUser) return;

  this.http.get<any>(
    `http://localhost:3000/employees/${this.currentUser.id}/leave-notification`
  ).subscribe({
    next: (data) => {
      if (data) {
        this.leaveStatusNotification = data;
        this.showLeaveStatusModal = true;
      }
    },
    error: (err) => {
      console.error('Error checking leave notification:', err);
    }
  });
}

closeLeaveStatusModal() {
  if (!this.leaveStatusNotification) {
    this.showLeaveStatusModal = false;
    return;
  }

  this.http.put(
    `http://localhost:3000/leaves/${this.leaveStatusNotification.id}/notification-seen`,
    {}
  ).subscribe({
    next: () => {
      this.showLeaveStatusModal = false;
      this.leaveStatusNotification = null;
      this.loadEmployeeLeaves();
    },
    error: (err) => {
      console.error('Error marking notification seen:', err);
    }
  });
}

showRejectModal = false;

showReviewNotification = false;

reviewNotification: any = null;

selectedLeave: any = null;

rejectionReason = '';

get totalEmployees() {
  return this.employees.length;
}

get totalTasksSubmitted() {
  return this.tasks.length;
}

get employerPendingLeaves() {
  return this.leaves.filter(leave => leave.status === 'Pending').length;
}

get employerActiveProjects() {
  return new Set(this.tasks.map(task => task.project)).size;
}

get employeeHoursToday() {
  return this.tasks.length * 2;
}

get employeeHoursThisWeek() {
  return this.tasks.length * 2;
}

get employeeActiveProjects() {
  return new Set(this.tasks.map(task => task.project)).size;
}

get employeePendingLeaves() {
  return this.leaves.filter(leave => leave.status === 'Pending').length;
}

toastMessage = '';
showToast = false;

showErrorToast(message: string) {
  this.toastMessage = message;
  this.showToast = true;

  setTimeout(() => {
    this.showToast = false;
  }, 3000);
}

showEmployerProfile() {
  this.employerTab = 'profile';
}

employerProfileTab = 'personal';

showEmployerPersonalInfo() {
  this.employerProfileTab = 'personal';
}

showEmployerLoginPassword() {
  this.employerProfileTab = 'password';
}

verifyEmployee(employee: any) {
  if (this.verifyingEmployeeId === employee.id) return;

  this.verifyingEmployeeId = employee.id;

  employee.verified = true;
  this.cdr.detectChanges();

  this.http.put(`http://localhost:3000/employees/${employee.id}/verify`, {}).subscribe({
    next: () => {
      this.verifyingEmployeeId = null;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error verifying employee:', err);
      employee.verified = false;
      this.verifyingEmployeeId = null;
      this.cdr.detectChanges();
    }
  });
}

unverifyEmployee(employee: any) {
  if (this.verifyingEmployeeId === employee.id) return;

  this.verifyingEmployeeId = employee.id;

  employee.verified = false;
  this.cdr.detectChanges();

  this.http.put(`http://localhost:3000/employees/${employee.id}/unverify`, {}).subscribe({
    next: () => {
      this.verifyingEmployeeId = null;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error unverifying employee:', err);
      employee.verified = true;
      this.verifyingEmployeeId = null;
      this.cdr.detectChanges();
    }
  });
}

employeeVerified = false;

loadCurrentUser(id: number) {
  this.http.get<any>(`http://localhost:3000/users/${id}`).subscribe({
    next: (data) => {
      this.currentUser = data;
      this.employeeVerified = data.verified;
    },
    error: (err) => {
      console.error('Error loading current user:', err);
    }
  });
}

loginEmail = '';
loginPassword = '';
selectedRole = '';
loginError = '';
currentUser: any = null;
isLoggingIn = false;

loginUser() {

  if (this.isLoggingIn) return;

  this.isLoggingIn = true;

  const payload = {
    email: this.loginEmail,
    password: this.loginPassword,
    role: this.selectedRole
  };

  this.http.post<any>('http://localhost:3000/login', payload).subscribe({

    next: (user) => {

      this.isLoggingIn = false;

      this.currentUser = user;
      this.employeeVerified = user.verified;
      this.loginError = '';

      if (user.role === 'employee') {

        this.page = 'employee-dashboard';
        this.dashboardTab = 'dashboard';

        this.loadTasks();
        this.loadLeaves();
        this.loadCurrentUser(user.id);
        this.loadEmployeeProfile(user.id);

        setTimeout(() => {
          this.loadDashboardCharts();
        }, 100);

      }

      if (user.role === 'employer') {

        this.page = 'employer-dashboard';
        this.employerTab = 'dashboard';

        this.loadTasks();
        this.loadLeaves();
        this.loadEmployees();
        this.loadEmployerProfile(user.id);

        setTimeout(() => {
          this.loadEmployerCharts();
        }, 100);

      }

      this.cdr.detectChanges();

    },

    error: (err) => {

      this.isLoggingIn = false;

      this.loginError =
        err.error?.message || 'Invalid email or password';

      console.error('Login error:', err);

      this.cdr.detectChanges();

    }

  });

}
currentEmployerProfile: any = null;

loadEmployerProfile(userId: number) {
  this.http
    .get<any>(`http://localhost:3000/employer-profile/${userId}`)
    .subscribe({
      next: (data) => {
        this.currentEmployerProfile = data;

        if (data.profile_image) {
          this.employerProfileImage = data.profile_image;
        }

        const nameParts = this.currentUser?.name?.split(' ') || [];
        this.employerFirstName = nameParts[0] || '';
        this.employerLastName = nameParts.slice(1).join(' ') || '';
      },
      error: (err) => {
        console.error('Error loading employer profile:', err);
      }
    });
}

loadEmployees() {
  this.http.get<any[]>('http://localhost:3000/employees').subscribe({
    next: (data) => {
      this.employees = data.map(employee => ({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.designation,
        department: employee.department,
        phone: employee.phone,
        hiredDate: employee.hired_date
          ? employee.hired_date.split('T')[0]
          : '',
        verified: employee.verified
      }));
    },
    error: (err) => {
      console.error('Error loading employees:', err);
    }
  });
}

removeEmployee(employee: any) {
  if (this.isRemovingEmployee) return;

  if (!confirm(`Remove ${employee.name}?`)) {
    return;
  }

  this.isRemovingEmployee = true;

  const oldEmployees = [...this.employees];

  // update UI immediately
  this.employees = this.employees.filter(e => e.id !== employee.id);
  this.cdr.detectChanges();

  this.http.delete(`http://localhost:3000/employees/${employee.id}`).subscribe({
    next: () => {
      this.isRemovingEmployee = false;
      this.loadEmployees();
    },
    error: (err) => {
      console.error('Error removing employee:', err);

      // restore if backend failed
      this.employees = oldEmployees;
      this.isRemovingEmployee = false;
      this.cdr.detectChanges();
    }
  });
}

editingEmployee: any = null;

editEmployee(employee: any) {
  this.editingEmployee = employee;

  this.newEmployee = {
    name: employee.name,
    role: employee.role,
    department: employee.department,
    email: employee.email,
    password: '',
    phone: employee.phone,
    hiredDate: employee.hiredDate,
    verified: employee.verified
  };

  this.showAddEmployeeModal = true;
  this.cdr.detectChanges();
}

resetEmployeeForm() {
  this.newEmployee = {
    name: '',
    role: '',
    department: '',
    email: '',
    password: '',
    phone: '',
    hiredDate: '',
    verified: false
  };

  this.editingEmployee = null;
  this.showAddEmployeeModal = false;
  this.isSavingEmployee = false;
}

showCredentialsModal = false;

generatedCredentials = {
  employeeCode: '',
  email: '',
  tempPassword: ''
};

copyCredentials() {
  const text = `
Employee ID: ${this.generatedCredentials.employeeCode}
Email: ${this.generatedCredentials.email}
Temporary Password: ${this.generatedCredentials.tempPassword}
`;

  navigator.clipboard.writeText(text);
}

closeCredentialsModal() {

  this.showCredentialsModal = false;

  this.resetEmployeeForm();

  this.cdr.detectChanges();

}
isSavingEmployee = false;

showTaskDescriptionModal = false;

selectedTaskDescription = '';

viewTaskDescription(task: any) {

  this.selectedTask = task;

  this.selectedTaskDescription = task.description;

  this.showTaskDescriptionModal = true;

}

closeTaskDescriptionModal(){

    this.showTaskDescriptionModal = false;

    this.selectedTask = null;

    this.selectedTaskDescription = '';

}
showProfileSavedModal = false;


saveEmployerProfile() {
  if (this.isSavingEmployerProfile) return;

  this.isSavingEmployerProfile = true;

  const fullName =
    `${this.employerFirstName} ${this.employerLastName}`.trim();

  const payload = {
    name: fullName,
    email: this.currentUser.email,
    phone: this.currentEmployerProfile.phone,
    designation: this.currentEmployerProfile.designation,
    department: this.currentEmployerProfile.department,
    office_location: this.currentEmployerProfile.office_location,
    profile_image: this.employerProfileImage
  };

  this.http.put(
    `http://localhost:3000/employer-profile/${this.currentUser.id}`,
    payload
  ).subscribe({
    next: () => {
      this.currentUser.name = fullName;
      this.loadEmployerProfile(this.currentUser.id);
      this.showProfileSavedModal = true;

      this.isSavingEmployerProfile = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error saving employer profile:', err);

      this.isSavingEmployerProfile = false;
      this.cdr.detectChanges();
    }
  });
}
employerFirstName = '';
employerLastName = '';

currentPassword = '';
newPassword = '';
confirmPassword = '';
isUpdatingPassword = false;

showCurrentPassword = false;
showNewPassword = false;
showConfirmPassword = false;

passwordMessage = '';
passwordError = '';
showPasswordSuccessModal = false;


updatePassword() {

  if (this.isUpdatingPassword) {
    return;
  }

  this.passwordMessage = '';
  this.passwordError = '';

  if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
    this.passwordError = 'Please fill all password fields.';
    return;
  }

  if (this.newPassword.length < 8) {
    this.passwordError = 'New password must be at least 8 characters.';
    return;
  }

  if (this.newPassword !== this.confirmPassword) {
    this.passwordError = 'New password and confirm password do not match.';
    return;
  }

  this.isUpdatingPassword = true;

  const payload = {
    currentPassword: this.currentPassword,
    newPassword: this.newPassword
  };

  this.http.put(
    `http://localhost:3000/users/${this.currentUser.id}/password`,
    payload
  ).subscribe({

    next: () => {

      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';

      this.passwordError = '';
      this.passwordMessage = '';

      this.showPasswordSuccessModal = true;

      this.isUpdatingPassword = false;

      this.cdr.detectChanges();

    },

    error: (err) => {

      this.passwordError =
        err.error?.message || 'Error updating password.';

      this.isUpdatingPassword = false;

      this.cdr.detectChanges();

    }

  });

}

employerProfileImage: string | ArrayBuffer | null = null;

onEmployerProfileImageSelected(event: any) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    this.employerProfileImage = reader.result as string;
  };

  reader.readAsDataURL(file);
}

employeeSearchText = '';
employeeFilter = 'all';
taskEmployeeFilter = '';
taskProjectFilter = '';
taskDateFilter = '';
taskFilter = '';

clearFilters() {

  this.taskEmployeeFilter = '';
  this.taskProjectFilter = '';
  this.taskDateFilter = '';
  this.taskFilter = '';
}

get filteredTasks() {
  return this.tasks.filter(task => {

    return (

      (!this.taskEmployeeFilter ||
        task.employeeName.toLowerCase().includes(this.taskEmployeeFilter.toLowerCase()))

      &&

      (!this.taskFilter ||
        task.task.toLowerCase().includes(this.taskFilter.toLowerCase()))

      &&

      (!this.taskProjectFilter ||
        task.project.toLowerCase().includes(this.taskProjectFilter.toLowerCase()))

      &&

      (!this.taskDateFilter ||
        task.date === this.taskDateFilter)

    );

  });
}
get filteredEmployees() {
  return this.employees.filter(employee => {
    const search = this.employeeSearchText.toLowerCase();

    const matchesSearch =
      employee.name.toLowerCase().includes(search) ||
      employee.email.toLowerCase().includes(search) ||
      employee.department?.toLowerCase().includes(search) ||
      employee.role?.toLowerCase().includes(search);

    const matchesFilter =
      this.employeeFilter === 'all' ||
      (this.employeeFilter === 'verified' && employee.verified === true) ||
      (this.employeeFilter === 'unverified' && employee.verified === false);

    return matchesSearch && matchesFilter;
  });
}

isEmployerSidebarOpen = true;

toggleEmployerSidebar() {
  this.isEmployerSidebarOpen = !this.isEmployerSidebarOpen;
}

isRemovingEmployee = false;
isEditingEmployee = false;
isVerifyingEmployee = false;

verifyingEmployeeId: number | null = null;

currentEmployeeProfile: any = null;

employeeFirstName = '';
employeeLastName = '';

employeeProfileImage = 'user.png';

showEmployeeProfileSavedModal = false;

loadEmployeeProfile(userId: number) {
  this.http.get<any>(`http://localhost:3000/employee-profile/${userId}`)
    .subscribe({
      next: (data) => {
        this.currentEmployeeProfile = data;

        const nameParts = data.name?.split(' ') || [];
        this.employeeFirstName = nameParts[0] || '';
        this.employeeLastName = nameParts.slice(1).join(' ') || '';

        if (data.profile_image) {
          this.employeeProfileImage = data.profile_image;
        }
      },
      error: (err) => {
        console.error('Error loading employee profile:', err);
      }
    });
}

saveEmployeeProfile() {
  if (this.isSavingEmployeeProfile) return;

  this.isSavingEmployeeProfile = true;

  const fullName =
    `${this.employeeFirstName} ${this.employeeLastName}`.trim();

  const payload = {
    name: fullName,
    email: this.currentEmployeeProfile.email,
    phone: this.currentEmployeeProfile.phone,
    designation: this.currentEmployeeProfile.designation,
    department: this.currentEmployeeProfile.department,
    address: this.currentEmployeeProfile.address,
    dob: this.currentEmployeeProfile.dob,
    profile_image: this.employeeProfileImage
  };

  this.http.put(
    `http://localhost:3000/employee-profile/${this.currentUser.id}`,
    payload
  ).subscribe({
    next: () => {
      this.currentUser.name = fullName;
      this.loadEmployeeProfile(this.currentUser.id);
      this.showEmployeeProfileSavedModal = true;

      this.isSavingEmployeeProfile = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error saving employee profile:', err);

      this.isSavingEmployeeProfile = false;
      this.cdr.detectChanges();
    }
  });
}

onEmployeeProfileImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) {
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    this.employeeProfileImage = reader.result as string;
  };

  reader.readAsDataURL(file);
}
showLeaveStatusModal = false;

leaveStatusNotification: any = null;

loadEmployeeTasks() {
  this.http.get<any[]>(`http://localhost:3000/employees/${this.currentUser.id}/tasks`)
    .subscribe({
      next: (data) => {
        this.tasks = data.map(task => ({
          id: task.id,
          employeeId: task.employee_id,
          employeeName: task.employee_name,
          startTime: task.start_time.substring(0, 5),
          endTime: task.end_time.substring(0, 5),
          date: task.task_date.split('T')[0],
          task: task.task_name,
          project: task.project_name,
          description: task.description,
          status: task.status || 'Pending',
          priority: task.priority,
          reviewComment: task.review_comment,
          reviewed_at: task.reviewed_at
        }));
      },
      error: (err) => console.error('Error loading employee tasks:', err)
    });
}

loadEmployeeLeaves() {
  this.http.get<any[]>(`http://localhost:3000/employees/${this.currentUser.id}/leaves`)
    .subscribe({
      next: (data) => {
        this.leaves = data.map(leave => ({
          id: leave.id,
          employeeId: leave.employee_id,
          employeeName: leave.employee_name,
          type: leave.leave_type,
          fromDate: leave.from_date.split('T')[0],
          toDate: leave.to_date.split('T')[0],
          days: leave.days,
          reason: leave.reason,
          status: leave.status,
          rejectionReason: leave.rejection_reason
        }));
      },
      error: (err) => console.error('Error loading employee leaves:', err)
    });
}
isEmployeeSidebarOpen = false;

toggleEmployeeSidebar() {
  this.isEmployeeSidebarOpen = !this.isEmployeeSidebarOpen;
}

reviewTask(task:any){

    this.selectedCommentTask = task;

    this.reviewComment = task.reviewComment || '';

    this.showCommentModal = true;

    this.openedActionMenu = null;

}
downloadPDF() {

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Employee Work Log Report', 14, 18);

  doc.setFontSize(10);

  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    25
  );

  autoTable(doc, {
    startY: 32,

    head: [[
      'Employee',
      'Task',
      'Project',
      'Date',
      'Start',
      'End',
      'Status'
    ]],

    body: this.filteredTasks.map(task => [

      task.employeeName,

      task.task,

      task.project,

      task.date,

      task.startTime,

      task.endTime,

      task.status || 'Pending'

    ])
  });

  doc.text(
    `Total Records: ${this.filteredTasks.length}`,
    14,
    (doc as any).lastAutoTable.finalY + 10
  );

  doc.save('Employee_Worklogs.pdf');

}

downloadExcel() {

  const data = this.filteredTasks.map(task => ({

    Employee: task.employeeName,

    Task: task.task,

    Project: task.project,

    Date: task.date,

    Start: task.startTime,

    End: task.endTime,

    Status: task.status || 'Pending'

  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Work Logs'
  );

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  const blob = new Blob(
    [excelBuffer],
    {
      type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  );

  saveAs(blob, 'Employee_Worklogs.xlsx');

}
openedActionMenu: number | null = null;

selectedTask: any = null;

toggleActionMenu(taskId: number){

    if(this.openedActionMenu === taskId){

        this.openedActionMenu = null;

    }else{

        this.openedActionMenu = taskId;

    }

}

showCommentModal = false;

showPriorityModal=false;

selectedPriorityTask:any=null;

selectedPriority='Medium';

reviewComment = '';

selectedCommentTask: any = null;

openCommentModal(task: any) {

  this.selectedCommentTask = task;

  this.reviewComment = task.reviewComment || '';

  this.showCommentModal = true;

  this.openedActionMenu = null;

}

closeCommentModal() {

  this.showCommentModal = false;

  this.selectedCommentTask = null;

  this.reviewComment = '';

}

saveReviewComment(){

if(!this.selectedCommentTask){

    return;

}

this.http.put(

`http://localhost:3000/tasks/${this.selectedCommentTask.id}`,

{

status:"Reviewed",

review_comment:this.reviewComment

}

).subscribe({

next:()=>{

this.closeCommentModal();

this.loadTasks();

},

error:(err)=>{

console.error(err);

}

});

}

openPriorityModal(task:any){

    this.selectedPriorityTask=task;

    this.selectedPriority=task.priority || 'Medium';

    this.showPriorityModal=true;

    this.openedActionMenu=null;

}

closePriorityModal(){

    this.showPriorityModal=false;

    this.selectedPriorityTask=null;

    this.selectedPriority='Medium';

}

savePriority(){

    if(!this.selectedPriorityTask){

        return;

    }

    this.http.put(

        `http://localhost:3000/tasks/${this.selectedPriorityTask.id}`,

        {

            priority:this.selectedPriority

        }

    ).subscribe({

        next:(updated:any)=>{

            this.selectedPriorityTask.priority=updated.priority;

            this.closePriorityModal();

        },

        error:(err)=>{

            console.error(err);

        }

    });

}

checkReviewNotifications() {

  console.log("Checking notifications for employee:", this.currentUser.id);

  this.http.get<any[]>(
    `http://localhost:3000/employees/${this.currentUser.id}/review-notifications`
  ).subscribe({

    next: (notifications) => {

      console.log("Notifications received:", notifications);

      if (notifications.length > 0) {

        this.reviewNotification = notifications[0];

        this.showReviewNotification = true;

      }

    },

    error: (err) => {

      console.error("Notification Error:", err);

    }

  });

}

closeReviewNotification() {

  this.http.put(

    `http://localhost:3000/tasks/${this.reviewNotification.id}/review-seen`,

    {}

  ).subscribe({

    next: () => {

      this.showReviewNotification = false;

      this.reviewNotification = null;

      this.loadEmployeeTasks();

    }

  });

}
}