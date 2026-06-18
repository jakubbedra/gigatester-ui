import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {TestViewComponent} from "./tests/test-view/test-view.component";
import {QuestionCardComponent} from "./questions/question-card/question-card.component";
import {TestSummaryComponent} from "./tests/test-summary/test-summary.component";

const routes: Routes = [
  { path: 'tests/:id', component: TestViewComponent },
  { path: 'tests/:id/executions', component: QuestionCardComponent },
  { path: 'tests/:id/summary', component: TestSummaryComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
