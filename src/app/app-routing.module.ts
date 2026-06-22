import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TestViewComponent } from './tests/test-view/test-view.component';
import { QuestionCardComponent } from './questions/question-card/question-card.component';
import { TestSummaryComponent } from './tests/test-summary/test-summary.component';
import { SubjectsListComponent } from './admin/subjects-list/subjects-list.component';
import { TestsListComponent } from './admin/tests-list/tests-list.component';
import { TestEditComponent } from './admin/test-edit/test-edit.component';
import { AllAtOnceComponent } from './tests/all-at-once/all-at-once.component';

const routes: Routes = [
  { path: 'tests/:id', component: TestViewComponent },
  { path: 'tests/:id/executions', component: QuestionCardComponent },
  { path: 'tests/:id/executions/all', component: AllAtOnceComponent },
  { path: 'tests/:id/summary', component: TestSummaryComponent },
  { path: 'admin/subjects', component: SubjectsListComponent },
  { path: 'admin/tests', component: TestsListComponent },
  { path: 'admin/tests/:id/edit', component: TestEditComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
