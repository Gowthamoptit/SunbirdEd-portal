import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, throwError} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, mergeMap } from 'rxjs/operators';
import { QuestionCursor } from '@project-sunbird/sunbird-quml-player';
import { EditorCursor } from '@project-sunbird/sunbird-questionset-editor';
import * as _ from 'lodash-es';
import { PublicPlayerService } from '@sunbird/public';

@Injectable({
  providedIn: 'root'
})

export class QumlPlayerV2Service implements QuestionCursor, EditorCursor {
  public questionMap =  new Map();
  constructor(private http: HttpClient,
    public playerService: PublicPlayerService) {}

  getQuestion(questionId: string): Observable<any> {
    if (_.isEmpty(questionId)) { return of({}); }
    const question = this.getQuestionData(questionId);
    if (question) {
        return of({questions : _.castArray(question)});
    } else {
      return this.post(_.castArray(questionId)).pipe(map((data) => {
        return data.result;
      }));
    }
  }

  getQuestions(questionIds: string[]): Observable<any> {
    return this.post(questionIds).pipe(map((data) => {
      return data.result;
    }));
  }

  getQuestionSet(identifier: string) {
    const hierarchy = this.playerService.getQuestionSetHierarchyV2(identifier);
    const questionSetResponse = this.playerService.getQuestionSetRead(identifier);

    return forkJoin([hierarchy, questionSetResponse]).pipe(map(res => {
      const questionSet = _.get(res[0], 'questionSet');
      const instructions = _.get(res[1], 'result.questionset.instructions');
      const outcomeDeclaration = _.get(res[1], 'result.questionset.outcomeDeclaration');
      if (questionSet && instructions) {
        questionSet['instructions'] = instructions;
      }
      if(questionSet && outcomeDeclaration) {
        questionSet['outcomeDeclaration'] = outcomeDeclaration;
      }
      return { questionSet };
    }));
  }

  getQuestionData(questionId) {
    return this.questionMap.get(_.first(_.castArray(questionId))) || undefined;
  }

  setQuestionMap(key, value) {
    this.questionMap.set(key, value);
  }

  clearQuestionMap() {
    this.questionMap.clear();
  }

  getAllQuestionSet(identifiers: string[]): Observable<any> {
    const option = {
      params: {
        fields: 'maxScore'
      }
    };
    const requests = _.map(identifiers, id => {
      return this.playerService.getQuestionSetRead(id, option);
    });
    return forkJoin(requests).pipe(
      map(res => {
        return res.map(item => _.get(item, 'result.questionset.maxScore'));
      })
    );
  }

  private post(questionIds): Observable<any> {
    const httpOptions = {
        headers: { 'Content-Type': 'application/json' }
    };
    const requestParam = {
      url: 'api/question/v2/list',
      data: {
        request: {
          search: {
            identifier: questionIds
          }
        }
      }
    };
    return this.http.post(requestParam.url, requestParam.data, httpOptions).pipe(
        mergeMap((data: any) => {
            if (data.responseCode !== 'OK') {
                return throwError(data);
            }
            return of(data);
        }));
  }

}