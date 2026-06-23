import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestViewComponent } from './tests/test-view/test-view.component';
import { QuestionCardComponent } from './questions/question-card/question-card.component';
import { TestSummaryComponent } from './tests/test-summary/test-summary.component';
import { SubjectsListComponent } from './admin/subjects-list/subjects-list.component';
import { SubjectGroupsListComponent } from './admin/subject-groups-list/subject-groups-list.component';
import { CrosswordsListComponent } from './admin/crosswords-list/crosswords-list.component';
import { CrosswordEditComponent } from './admin/crossword-edit/crossword-edit.component';
import { TestsListComponent } from './admin/tests-list/tests-list.component';
import { TestEditComponent } from './admin/test-edit/test-edit.component';
import { AllAtOnceComponent } from './tests/all-at-once/all-at-once.component';
import { CrosswordViewComponent } from './crosswords/crossword-view/crossword-view.component';
import { CrosswordPlayComponent } from './crosswords/crossword-play/crossword-play.component';
import { LoginComponent } from './auth/login/login.component';
import { AccountComponent } from './account/account.component';
import { AuthGuard } from './guard/auth.guard';
import { ModeratorGuard } from './guard/moderator.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'account', component: AccountComponent, canActivate: [AuthGuard] },
  { path: 'tests/:id', component: TestViewComponent, canActivate: [AuthGuard] },
  { path: 'tests/:id/executions', component: QuestionCardComponent, canActivate: [AuthGuard] },
  { path: 'tests/:id/executions/all', component: AllAtOnceComponent, canActivate: [AuthGuard] },
  { path: 'tests/:id/summary', component: TestSummaryComponent, canActivate: [AuthGuard] },
  { path: 'admin/subjects', component: SubjectsListComponent, canActivate: [AuthGuard, ModeratorGuard] },
  { path: 'admin/subject-groups', component: SubjectGroupsListComponent, canActivate: [AuthGuard, ModeratorGuard] },
  { path: 'admin/crosswords', component: CrosswordsListComponent, canActivate: [AuthGuard, ModeratorGuard] },
  { path: 'admin/crosswords/:id/edit', component: CrosswordEditComponent, canActivate: [AuthGuard, ModeratorGuard] },
  { path: 'admin/tests', component: TestsListComponent, canActivate: [AuthGuard, ModeratorGuard] },
  { path: 'admin/tests/:id/edit', component: TestEditComponent, canActivate: [AuthGuard, ModeratorGuard] },
  { path: 'crosswords/states/:id', component: CrosswordPlayComponent, canActivate: [AuthGuard] },
  { path: 'crosswords/:id', component: CrosswordViewComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
