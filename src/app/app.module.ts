import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ClosedQuestionComponent } from './questions/closed-question/closed-question.component';
import { OpenQuestionComponent } from './questions/open-question/open-question.component';
import { QuestionCardComponent } from './questions/question-card/question-card.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';
import { TestViewComponent } from './tests/test-view/test-view.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TestSummaryComponent } from './tests/test-summary/test-summary.component';
import { StatementQuestionComponent } from './questions/statement-question/statement-question.component';
import { SubjectsListComponent } from './admin/subjects-list/subjects-list.component';
import { TestsListComponent } from './admin/tests-list/tests-list.component';
import { TestEditComponent } from './admin/test-edit/test-edit.component';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    ClosedQuestionComponent,
    OpenQuestionComponent,
    QuestionCardComponent,
    TestViewComponent,
    TestSummaryComponent,
    StatementQuestionComponent,
    SubjectsListComponent,
    TestsListComponent,
    TestEditComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DragDropModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
