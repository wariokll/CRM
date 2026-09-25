import { useMemo, useState } from 'react'
import {
  Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Ellipsis, FileText, LayoutDashboard, MapPin, MoreHorizontal,
  Plus, Search, Settings, ShieldCheck, Store, Users, X
} from 'lucide-react'

type Status = 'Новая' | 'Принята' | 'В работе' | 'Выполнена'
type Request = { id: string; title: string; client: string; place: string; date: string; time: string; status: Status; color: string; urgent?: boolean; avatar: string }

const initialRequests: Request[] = [
  { id: '#1048', title: 'Не работает касса', client: 'ИП Соколова', place: 'Магазин «Центральный»', date: 'Сегодня', time: '09:20', status: 'Новая', color: 'coral', urgent: true, avatar: 'С' },
  { id: '#1047', title: 'Ошибка при закрытии смены', client: 'ИП Вершинин', place: 'Точка на Ленина, 24', date: 'Сегодня', time: '08:45', status: 'В работе', color: 'violet', urgent: true, avatar: 'В' },
  { id: '#1045', title: 'Подключение к ОФД', client: 'ИП Абрамова', place: 'Кофейня «Три зерна»', date: 'Вчера', time: '18:10', status: 'Принята', color: 'blue', urgent: true, avatar: 'А' },
  { id: '#1041', title: 'Замена фискального накопителя', client: 'ИП Громов', place: 'Магазин «У дома»', date: 'Вчера', time: '15:30', status: 'В работе', color: 'mint', urgent: true, avatar: 'Г' },
]

const scheduled: Request[] = [
  { id: '#1046', title: 'Плановое обслуживание', client: 'ИП Орлова', place: 'Магазин на Мира, 8', date: '30 сен', time: '11:00', status: 'Принята', color: 'mint', avatar: 'О' },
  { id: '#1044', title: 'Обновление ПО', client: 'ИП Власова', place: 'Пекарня «Булка»', date: '02 окт', time: '14:00', status: 'Новая', color: 'blue', avatar: 'В' },
  { id: '#1043', title: 'Настройка оборудования', client: 'ИП Соколова', place: 'Магазин «Центральный»', date: '04 окт', time: '10:30', status: 'Принята', color: 'violet', avatar: 'С' },
]

const statusTone: Record<Status, string> = { 'Новая': 'new', 'Принята': 'accepted', 'В работе': 'progress', 'Выполнена': 'done' }

function StatusBadge({ status }: { status: Status }) { return <span className={`status ${statusTone[status]}`}><i />{status}</span> }

function RequestCard({ request, onOpen }: { request: Request; onOpen: () => void }) {
  return <button className="request-card" onClick={onOpen}>
    <div className="request-top"><span className={`type-dot ${request.color}`} /><span className="request-id">{request.id}</span><MoreHorizontal size={19} /></div>
    <strong>{request.title}</strong>
    <div className="request-client"><span className="avatar">{request.avatar}</span><span>{request.client}</span></div>
    <div className="request-place"><MapPin size={15} />{request.place}</div>
    <div className="request-bottom"><span className="muted">{request.date}, {request.time}</span><StatusBadge status={request.status} /></div>
  </button>
}

function App() {
  const [section, setSection] = useState('Обзор')
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState('Все')
  const [selected, setSelected] = useState<Request | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState('')
  const visibleRequests = useMemo(() => filter === 'Все' ? requests : requests.filter(x => x.status === filter), [filter, requests])
  const nav = [
    ['Обзор', LayoutDashboard], ['Заявки', ClipboardList], ['Календарь', CalendarDays], ['Клиенты', Users], ['Торговые точки', Store], ['Типы заявок', FileText]
  ] as const
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const changeStatus = (id: string, status: Status) => {
    setRequests(current => current.map(item => item.id === id ? { ...item, status } : item))
    setSelected(current => current ? { ...current, status } : null)
    notify(`Статус заявки ${id} обновлён`)
  }
  const createRequest = () => {
    setRequests(current => [{ id: '#1049', title: 'Новая заявка', client: 'ИП Соколова', place: 'Магазин «Центральный»', date: 'Только что', time: '10:42', status: 'Новая', color: 'coral', urgent: true, avatar: 'С' }, ...current])
    setCreateOpen(false); notify('Срочная заявка создана')
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><span /></span><span>Servio<span className="brand-dot">.</span></span></div>
      <div className="workspace"><span className="workspace-icon">М</span><span><small>РАБОЧЕЕ ПРОСТРАНСТВО</small><b>Мой сервис</b></span><ChevronDown size={16} /></div>
      <nav>{nav.map(([name, Icon]) => <button key={name} className={section === name ? 'active' : ''} onClick={() => setSection(name)}><Icon size={19}/><span>{name}</span>{name === 'Заявки' && <em>12</em>}</button>)}</nav>
      <div className="sidebar-bottom"><button onClick={() => notify('Настройки открыты')}><Settings size={19}/><span>Настройки</span></button><div className="profile"><div className="avatar profile-avatar">МС</div><span><b>Мария Сергеева</b><small>Администратор</small></span><ChevronDown size={16}/></div></div>
    </aside>

    <section className="content">
      <header><div className="crumb">Рабочее пространство <ChevronRight size={14}/> <b>{section}</b></div><div className="header-actions"><button className="icon-button"><Search size={20}/></button><button className="notification"><Bell size={20}/><i /></button><button className="help">?</button></div></header>
      <div className="page">
        <div className="title-row"><div><h1>{section === 'Обзор' ? 'Доброе утро, Мария!' : section}</h1><p>{section === 'Обзор' ? 'Вот что происходит в сервисе сегодня.' : 'Управляйте данными вашего сервиса.'}</p></div><button className="primary" onClick={() => setCreateOpen(true)}><Plus size={19}/>Создать заявку</button></div>

        <div className="stats">
          <div className="stat"><span className="stat-icon coral-bg"><ClipboardList size={21}/></span><div><small>Новые заявки</small><strong>12</strong><span className="trend up">↑ 20% <i>к прошлой неделе</i></span></div><button><Ellipsis size={19}/></button></div>
          <div className="stat"><span className="stat-icon violet-bg"><Settings size={21}/></span><div><small>В работе</small><strong>8</strong><span className="trend up">↑ 12% <i>к прошлой неделе</i></span></div><button><Ellipsis size={19}/></button></div>
          <div className="stat"><span className="stat-icon green-bg"><Check size={21}/></span><div><small>Выполнено за месяц</small><strong>84</strong><span className="trend up">↑ 8% <i>к прошлому месяцу</i></span></div><button><Ellipsis size={19}/></button></div>
          <div className="stat"><span className="stat-icon amber-bg"><Users size={21}/></span><div><small>Активные клиенты</small><strong>36</strong><span className="trend up">↑ 3 <i>за месяц</i></span></div><button><Ellipsis size={19}/></button></div>
        </div>

        <section className="main-grid">
          <article className="urgent-panel panel"><div className="panel-title"><div><h2>Срочные заявки <span className="count">{requests.length}</span></h2><p>Требуют внимания в первую очередь</p></div><button className="text-button" onClick={() => setSection('Заявки')}>Все заявки <ChevronRight size={16}/></button></div>
            <div className="filters">{['Все', 'Новая', 'Принята', 'В работе'].map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'selected' : ''}>{item}</button>)}</div>
            <div className="request-list">{visibleRequests.map(item => <RequestCard request={item} key={item.id} onOpen={() => setSelected(item)}/>)}</div>
          </article>
          <aside className="right-column">
            <article className="panel calendar"><div className="panel-title"><div><h2>Расписание</h2><p>Ближайшие запланированные работы</p></div><button className="calendar-nav"><ChevronLeft size={17}/><ChevronRight size={17}/></button></div>
              <div className="month">Сентябрь 2026 <ChevronDown size={15}/></div><div className="weekdays">{['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(x=><span key={x}>{x}</span>)}</div><div className="dates">{Array.from({length: 35}, (_, index) => { const value = index - 2; const isToday = value === 25; return <span className={value < 1 || value > 30 ? 'outside' : isToday ? 'today' : ''} key={index}>{value < 1 ? 29 + value : value > 30 ? value - 30 : value}{value === 30 && <i/>}</span> })}</div>
              <div className="calendar-events">{scheduled.slice(0,2).map(item=><button key={item.id} onClick={()=>setSelected(item)}><span className={`type-dot ${item.color}`}/><span><b>{item.time} · {item.title}</b><small>{item.place}</small></span></button>)}</div>
              <button className="text-button schedule-link" onClick={() => setSection('Календарь')}>Открыть календарь <ChevronRight size={16}/></button>
            </article>
            <article className="panel moderation"><div className="moderation-icon"><ShieldCheck size={20}/></div><div><h3>Новые на модерации</h3><p>3 клиента и 2 точки ожидают решения</p><button onClick={() => notify('Раздел модерации открыт')}>Перейти к модерации <ChevronRight size={15}/></button></div></article>
          </aside>
        </section>
        <section className="panel planned"><div className="panel-title"><div><h2>Запланированные заявки</h2><p>Работы на ближайшие дни</p></div><button className="text-button" onClick={()=>setSection('Календарь')}>Весь календарь <ChevronRight size={16}/></button></div><div className="planned-list">{scheduled.map(item=><RequestCard request={item} key={item.id} onOpen={()=>setSelected(item)}/>)}</div></section>
      </div>
    </section>

    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><article className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={() => setSelected(null)}><X size={19}/></button><span className="request-id">ЗАЯВКА {selected.id}</span><h2>{selected.title}</h2><div className="modal-client"><span className="avatar">{selected.avatar}</span><span><b>{selected.client}</b><small>{selected.place}</small></span></div><div className="modal-info"><span><small>Создана</small><b>{selected.date}, {selected.time}</b></span><span><small>Текущий статус</small><StatusBadge status={selected.status}/></span></div><label>Комментарий для клиента<textarea placeholder="Добавьте комментарий или детали работы..." /></label><div className="modal-footer"><select value={selected.status} onChange={e => changeStatus(selected.id, e.target.value as Status)}>{(['Новая','Принята','В работе','Выполнена'] as Status[]).map(x=><option key={x}>{x}</option>)}</select><button className="primary" onClick={() => { changeStatus(selected.id, selected.status); setSelected(null) }}>Сохранить изменения</button></div></article></div>}
    {createOpen && <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}><article className="modal create-modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={() => setCreateOpen(false)}><X size={19}/></button><span className="request-id">НОВАЯ ЗАЯВКА</span><h2>Создать заявку</h2><label>Тип заявки<select><option>Не работает касса</option><option>Ошибка при закрытии смены</option><option>Подключение к ОФД</option></select></label><label>Торговая точка<select><option>Магазин «Центральный»</option><option>Точка на Ленина, 24</option></select></label><label>Описание<textarea placeholder="Опишите проблему" /></label><div className="modal-footer"><button className="secondary" onClick={() => setCreateOpen(false)}>Отмена</button><button className="primary" onClick={createRequest}>Создать срочную</button></div></article></div>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </main>
}

export default App
