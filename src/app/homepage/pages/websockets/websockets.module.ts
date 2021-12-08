import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { AdapterComponent } from './adapter/adapter.component';
import { WsExceptionFiltersComponent } from './exception-filters/exception-filters.component';
import { GatewaysComponent } from './gateways/gateways.component';
import { WsGuardsComponent } from './guards/guards.component';
import { WsInterceptorsComponent } from './interceptors/interceptors.component';
import { WsPipesComponent } from './pipes/pipes.component';

const routes: Routes = [
  {
    path: 'gateways',
    component: GatewaysComponent,
    data: { title: '网关' },
  },
  {
    path: 'pipes',
    component: WsPipesComponent,
    data: { title: '管道 - 网关' },
  },
  {
    path: 'exception-filters',
    component: WsExceptionFiltersComponent,
    data: { title: '异常过滤器-网关' },
  },
  {
    path: 'guards',
    component: WsGuardsComponent,
    data: { title: '警卫 - 网关' },
  },
  {
    path: 'interceptors',
    component: WsInterceptorsComponent,
    data: { title: '拦截器 - 网关' },
  },
  {
    path: 'adapter',
    component: AdapterComponent,
    data: { title: '适配器 - 网关' },
  },
];

@NgModule({
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
  declarations: [
    GatewaysComponent,
    AdapterComponent,
    WsPipesComponent,
    WsInterceptorsComponent,
    WsGuardsComponent,
    WsExceptionFiltersComponent,
  ],
})
export class WebsocketsModule {}
