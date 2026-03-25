<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Field, FieldLabel, FieldContent } from '$lib/components/ui/field/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils.js';
	import { type DateValue, getLocalTimeZone, CalendarDate } from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import FileIcon from '@tabler/icons-svelte/icons/file';
	import DownloadIcon from '@tabler/icons-svelte/icons/download';
	import XIcon from '@tabler/icons-svelte/icons/x';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import LoaderIcon from '@tabler/icons-svelte/icons/loader';
	import HomeContractDialog from './home-contract-dialog.svelte';
	import {
		dateFormatter,
		validatePhone,
		validateEmail,
		formatPhoneNumber,
		formatCurrency,
		parseCurrency
	} from './data-table/utils.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	let {
		open = $bindable(false),
		editingASData = $bindable<any>(null),
		contractList = [],
		clientList = [],
		productList = [],
		firmwareList = []
	}: {
		open?: boolean;
		editingASData?: any;
		contractList?: Array<any>;
		clientList?: Array<any>;
		productList?: Array<any>;
		firmwareList?: Array<any>;
	} = $props();

	// AS 타입 선택 (contract: 계약에 종속, single: 단일 AS)
	let asType = $state<'contract' | 'single'>('single');
	let selectedContractId = $state<string>('');
	let selectedClientId = $state<string>('');

	// Popover 상태
	let openContractSelect = $state(false);
	let openClientSelect = $state(false);
	let contractTriggerRef = $state<HTMLButtonElement | null>(null);
	let clientTriggerRef = $state<HTMLButtonElement | null>(null);
	let loadingContractId = $state<number | null>(null);
	let loadingClientId = $state<number | null>(null);

	// 계약 수정 다이얼로그 상태
	let contractEditDialogOpen = $state(false);
	let editingContractRow = $state<any>(null);

	// 고객사 수정 다이얼로그 상태
	let clientEditDialogOpen = $state(false);
	let editingClientId = $state<number | null>(null);
	let editingClientRow = $state<any>(null);
	let submittingClient = $state(false);

	// 고객사 폼 상태
	let newCustomerName = $state('');
	let newCustomerSource = $state('');
	let newCustomerItem3 = $state('');
	let newCustomerItem4 = $state('');
	let newCustomerItem5 = $state('');
	let newCustomerZipCode = $state('');
	let newCustomerAddress = $state('');
	let newCustomerFax = $state('');
	let newCustomerBusinessNumber = $state('');
	let newCustomerMainContactName = $state('');
	let newCustomerMainContactPosition = $state('');
	let newCustomerMainContactPhone = $state('');
	let newCustomerMainContactEmail = $state('');
	let newCustomerSubContactName = $state('');
	let newCustomerSubContactPosition = $state('');
	let newCustomerSubContactPhone = $state('');
	let newCustomerSubContactEmail = $state('');
	let newCustomerBizLicenseFile = $state<File | null>(null);
	let existingCustomerRegistrationFileName = $state<string | null>(null);
	let existingCustomerRegistrationFileListId = $state<string | null>(null);

	// 고객사 폼 검증 에러
	let mainContactPhoneError = $state<string | null>(null);
	let mainContactEmailError = $state<string | null>(null);
	let subContactPhoneError = $state<string | null>(null);
	let subContactEmailError = $state<string | null>(null);
	let faxError = $state<string | null>(null);

	// Form state
	let requestDate = $state<DateValue | undefined>(undefined);
	let responseDate = $state<DateValue | undefined>(undefined);
	let requestContent = $state('');
	let responseContent = $state('');
	let cost = $state('');
	let isCompleted = $state(false);
	let asFile = $state<File | null>(null);
	let existingFileName = $state<string | null>(null);
	let existingFileListId = $state<string | null>(null);

	let requestDateOpen = $state(false);
	let responseDateOpen = $state(false);
	let submitting = $state(false);
	let validationError = $state<string | null>(null);
	let dialogScrollContainer = $state<HTMLDivElement | null>(null);

	// 내부 리스트 (옵션 로딩용)
	let internalContractList = $state<any[]>([]);
	let internalClientList = $state<any[]>([]);
	let optionsLoaded = $state(false);

	async function fetchOptions() {
		if (optionsLoaded) return;
		try {
			const res = await fetch('/api/as/options');
			if (res.ok) {
				const data = await res.json();
				internalContractList = data.contractList || [];
				internalClientList = data.clientList || [];
				optionsLoaded = true;
			}
		} catch (e) {
			console.error('Failed to fetch options', e);
			// Fallback to passed props
			internalContractList = contractList;
			internalClientList = clientList;
		}
	}

	// Force refresh options after editing client/contract
	async function forceRefreshOptions() {
		optionsLoaded = false;
		await fetchOptions();
	}

	// 다이얼로그 열릴 때 옵션 로드
	$effect(() => {
		if (open) {
			fetchOptions();
		}
	});

	// Track previous dialog states
	let prevContractEditDialogOpen = $state(false);
	let prevClientEditDialogOpen = $state(false);

	// Refresh options when contract edit dialog closes (might have been edited)
	$effect(() => {
		if (prevContractEditDialogOpen && !contractEditDialogOpen) {
			// Dialog just closed, refresh options
			forceRefreshOptions();
		}
		prevContractEditDialogOpen = contractEditDialogOpen;
	});

	// Refresh options when client edit dialog closes
	$effect(() => {
		if (prevClientEditDialogOpen && !clientEditDialogOpen) {
			// Dialog just closed, refresh options
			forceRefreshOptions();
		}
		prevClientEditDialogOpen = clientEditDialogOpen;
	});

	// Date formatter is imported from data-table/utils.js

	function stringToDateValue(str: string | null | undefined): DateValue | undefined {
		if (!str) return undefined;
		const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (match) {
			return new CalendarDate(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
		}
		return undefined;
	}

	function dateValueToString(date: DateValue | undefined): string {
		if (!date) return '';
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}

	function formatContractLabel(contract: any): string {
		if (contract?.name?.trim()) return contract.name.trim();
		return `계약 ${contract?.id || ''}`;
	}

	// Load data when editingASData changes
	$effect(() => {
		if (open && editingASData) {
			// Determine AS type based on data
			if (editingASData.contractId) {
				asType = 'contract';
				selectedContractId = String(editingASData.contractId);
				selectedClientId = '';
			} else if (editingASData.clientId) {
				asType = 'single';
				selectedClientId = String(editingASData.clientId);
				selectedContractId = '';
			} else {
				asType = 'single';
				selectedContractId = '';
				selectedClientId = '';
			}

			requestDate = stringToDateValue(editingASData.requestDate);
			responseDate = stringToDateValue(editingASData.responseDate);
			requestContent = editingASData.requestContent || '';
			responseContent = editingASData.responseContent || '';
			cost = editingASData.cost ? formatCurrency(String(editingASData.cost)) : '';
			isCompleted = !!editingASData.isCompleted;
			existingFileName = editingASData.photoFileName || null;
			existingFileListId = editingASData.photoFileListId || null;
			asFile = null;
		}
	});

	function resetForm() {
		asType = 'single';
		selectedContractId = '';
		selectedClientId = '';
		requestDate = undefined;
		responseDate = undefined;
		requestContent = '';
		responseContent = '';
		cost = '';
		isCompleted = false;
		asFile = null;
		existingFileName = null;
		existingFileListId = null;
		validationError = null;
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			asFile = input.files[0];
		}
	}

	async function removeFile() {
		asFile = null;
		existingFileName = null;
		existingFileListId = null;
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			setTimeout(() => {
				resetForm();
				editingASData = null;
			}, 300);
		}
	}}
>
	<Dialog.Content
		class="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
	>
		<div class="px-6 pt-6">
			<Dialog.Header>
				<Dialog.Title>AS 수정</Dialog.Title>
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action="/as?/updateASRecord"
			use:enhance={({ formData, cancel }) => {
				submitting = true;
				validationError = null;

				formData.set('id', String(editingASData?.id || ''));
				formData.set('asType', asType);

				if (asType === 'contract') {
					formData.set('contractId', selectedContractId || '');
				} else {
					formData.set('clientId', selectedClientId || '');
				}

				formData.set('requestDate', dateValueToString(requestDate));
				formData.set('requestContent', requestContent || '');
				formData.set('responseDate', dateValueToString(responseDate));
				formData.set('responseContent', responseContent || '');
				formData.set('cost', parseCurrency(cost) || '0');
				formData.set('isCompleted', isCompleted ? '1' : '0');

				if (asFile) {
					formData.set('asFile', asFile);
				}

				// If file was removed
				if (!asFile && !existingFileName && existingFileListId) {
					formData.set('removeAsFile', 'true');
				}

				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'success') {
						toast.success('AS가 수정되었습니다.');
						open = false;
						await update({ reset: false });
						await invalidateAll();
					} else if (result.type === 'failure') {
						const errorMessage = (result.data as any)?.message ?? 'AS 수정에 실패했습니다.';
						toast.error(String(errorMessage));
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				<div class="space-y-4">
					<!-- AS 타입 및 대상 선택 -->
					<div class="flex flex-col md:flex-row gap-4 md:items-end">
						<div class="space-y-2 flex-[2]">
							<Label>AS 타입</Label>
							<ButtonGroup.Root class="w-full">
								<Button
									variant={asType === 'contract' ? 'default' : 'outline'}
									size="sm"
									type="button"
									class="flex-1"
									onclick={() => {
										asType = 'contract';
										selectedContractId = '';
									}}
								>
									계약 AS
								</Button>
								<Button
									variant={asType === 'single' ? 'default' : 'outline'}
									size="sm"
									type="button"
									class="flex-1"
									onclick={() => {
										asType = 'single';
										selectedClientId = '';
									}}
								>
									단일 AS
								</Button>
							</ButtonGroup.Root>
						</div>

						{#if asType === 'contract'}
							<div class="space-y-2 flex-[3]">
								<Label>계약 선택</Label>
								<Popover.Root bind:open={openContractSelect}>
									<Popover.Trigger bind:ref={contractTriggerRef} class="w-full">
										{#snippet child({ props })}
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={openContractSelect}
												class="w-full justify-between overflow-hidden min-w-0"
												{...props}
											>
												<span class="flex-1 min-w-0 truncate text-left mr-2">
													{selectedContractId
														? (() => {
																const contract = internalContractList.find(
																	(c) => c.id.toString() === selectedContractId
																);
																return contract
																	? formatContractLabel(contract)
																	: '계약을 선택하세요';
															})()
														: '계약을 선택하세요'}
												</span>
												<ChevronsUpDownIcon class="h-4 w-4 shrink-0 opacity-50" />
											</Button>
										{/snippet}
									</Popover.Trigger>
									<Popover.Content
										align="start"
										class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0"
									>
										<Command.Root>
											<Command.Input placeholder="계약 검색..." />
											<Command.List>
												<Command.Empty>계약을 찾을 수 없습니다.</Command.Empty>
												<Command.Group>
													{#each internalContractList as contract (contract.id)}
														<Command.Item
															value={`${contract.id} ${contract.name} ${contract.customerName}`}
															onSelect={() => {
																selectedContractId = contract.id.toString();
																openContractSelect = false;
																tick().then(() => contractTriggerRef?.focus());
															}}
															class="flex items-center justify-between group"
														>
															<div class="flex items-center gap-2">
																<CheckIcon
																	class={cn(
																		'me-2 size-4',
																		selectedContractId !== contract.id.toString() &&
																			'text-transparent'
																	)}
																/>
																{(contract?.name ?? '').trim()}
															</div>
															<Button
																variant="ghost"
																size="icon"
																class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
																disabled={loadingContractId === contract.id}
																onclick={async (e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	loadingContractId = contract.id;
																	try {
																		const response = await fetch(`/api/contracts/${contract.id}`);
																		if (response.ok) {
																			const contractData = await response.json();
																			if (contractData) {
																				editingContractRow = contractData;
																				contractEditDialogOpen = true;
																				openContractSelect = false;
																			}
																		}
																	} catch (error) {
																		console.error('Failed to load contract:', error);
																		toast.error('계약 데이터를 불러오는데 실패했습니다.');
																	} finally {
																		loadingContractId = null;
																	}
																}}
															>
																{#if loadingContractId === contract.id}
																	<LoaderIcon class="h-3 w-3 animate-spin" />
																{:else}
																	<DotsVerticalIcon class="h-4 w-4" />
																{/if}
																<span class="sr-only">수정</span>
															</Button>
														</Command.Item>
													{/each}
												</Command.Group>
											</Command.List>
										</Command.Root>
									</Popover.Content>
								</Popover.Root>
							</div>
						{:else}
							<div class="space-y-2 flex-[3]">
								<Label>고객사 선택</Label>
								<Popover.Root bind:open={openClientSelect}>
									<Popover.Trigger bind:ref={clientTriggerRef} class="w-full">
										{#snippet child({ props })}
											<Button
												variant="outline"
												role="combobox"
												aria-expanded={openClientSelect}
												class="w-full justify-between overflow-hidden min-w-0"
												{...props}
											>
												<span class="flex-1 min-w-0 truncate text-left mr-2">
													{selectedClientId
														? (() => {
																const client = internalClientList.find(
																	(c) => c.id.toString() === selectedClientId
																);
																return client ? client.customerName : '고객사를 선택하세요';
															})()
														: '고객사를 선택하세요'}
												</span>
												<ChevronsUpDownIcon class="h-4 w-4 shrink-0 opacity-50" />
											</Button>
										{/snippet}
									</Popover.Trigger>
									<Popover.Content
										align="start"
										class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0"
									>
										<Command.Root>
											<Command.Input placeholder="고객사 검색..." />
											<Command.List>
												<Command.Empty>고객사를 찾을 수 없습니다.</Command.Empty>
												<Command.Group>
													{#each internalClientList as client (client.id)}
														<Command.Item
															value={`${client.id} ${client.customerName}`}
															onSelect={() => {
																selectedClientId = client.id.toString();
																openClientSelect = false;
																tick().then(() => clientTriggerRef?.focus());
															}}
															class="flex items-center justify-between group"
														>
															<div class="flex items-center gap-2">
																<CheckIcon
																	class={cn(
																		'me-2 size-4',
																		selectedClientId !== client.id.toString() && 'text-transparent'
																	)}
																/>
																{client.customerName}
															</div>
															<Button
																variant="ghost"
																size="icon"
																class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
																disabled={loadingClientId === client.id}
																onclick={async (e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	loadingClientId = client.id;
																	try {
																		const response = await fetch(`/api/clients/${client.id}`);
																		if (response.ok) {
																			const clientData = await response.json();
																			if (clientData) {
																				editingClientRow = clientData;
																				newCustomerName = clientData.name1 || '';
																				newCustomerSource = clientData.name2 || '';
																				newCustomerItem3 = clientData.name3 || '';
																				newCustomerItem4 = clientData.name4 || '';
																				newCustomerItem5 = clientData.name5 || '';
																				newCustomerBusinessNumber = clientData.businessNumber || '';
																				newCustomerZipCode = clientData.zipCode || '';
																				newCustomerAddress = clientData.address || '';
																				newCustomerFax = clientData.fax || '';
																				newCustomerMainContactName =
																					clientData.mainContactName || '';
																				newCustomerMainContactPosition =
																					clientData.mainContactPosition || '';
																				newCustomerMainContactPhone =
																					clientData.mainContactPhone || '';
																				newCustomerMainContactEmail =
																					clientData.mainContactEmail || '';
																				newCustomerSubContactName = clientData.subContactName || '';
																				newCustomerSubContactPosition =
																					clientData.subContactPosition || '';
																				newCustomerSubContactPhone =
																					clientData.subContactPhone || '';
																				newCustomerSubContactEmail =
																					clientData.subContactEmail || '';
																				existingCustomerRegistrationFileListId =
																					clientData.registrationFileListId || null;
																				existingCustomerRegistrationFileName =
																					clientData.registrationFileName || null;
																				newCustomerBizLicenseFile = null;
																				editingClientId = client.id;
																				clientEditDialogOpen = true;
																				openClientSelect = false;
																			} else {
																				toast.error('고객사 데이터를 불러오는데 실패했습니다.');
																			}
																		} else {
																			const errorText = await response.text();
																			console.error('Failed to fetch client:', errorText);
																			toast.error('고객사 데이터를 불러오는데 실패했습니다.');
																		}
																	} catch (error) {
																		console.error('Failed to load client:', error);
																		toast.error('고객사 데이터를 불러오는데 실패했습니다.');
																	} finally {
																		loadingClientId = null;
																	}
																}}
															>
																{#if loadingClientId === client.id}
																	<LoaderIcon class="h-3 w-3 animate-spin" />
																{:else}
																	<DotsVerticalIcon class="h-4 w-4" />
																{/if}
																<span class="sr-only">수정</span>
															</Button>
														</Command.Item>
													{/each}
												</Command.Group>
											</Command.List>
										</Command.Root>
									</Popover.Content>
								</Popover.Root>
							</div>
						{/if}

						<div class="flex-[2] flex flex-col md:flex-row gap-4">
							<div class="space-y-2 flex-1">
								<Label>비용</Label>
								<Input
									type="text"
									placeholder="비용"
									bind:value={cost}
									class="text-left"
									oninput={(e) => {
										cost = formatCurrency(e.currentTarget.value);
									}}
								/>
							</div>

							<div class="space-y-2 md:w-auto md:shrink-0">
								<Label>완료 여부</Label>
								<div class="flex items-center space-x-2 h-9">
									<Checkbox id="as-completed" bind:checked={isCompleted} />
									<Label
										for="as-completed"
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										완료
									</Label>
								</div>
							</div>
						</div>
					</div>

					<!-- 요청/대응 정보 (2-column grid) -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-4 flex-1">
							<div class="space-y-2 w-full">
								<Label>요청일자</Label>
								<Popover.Root bind:open={requestDateOpen}>
									<Popover.Trigger class="w-full">
										{#snippet child({ props })}
											<Button
												variant="outline"
												class={cn(
													'w-full justify-start text-start font-normal',
													!requestDate && 'text-muted-foreground'
												)}
												{...props}
											>
												<CalendarIcon class="me-2 size-4" />
												{requestDate
													? dateFormatter.format(requestDate.toDate(getLocalTimeZone()))
													: '요청일자 선택'}
											</Button>
										{/snippet}
									</Popover.Trigger>
									<Popover.Content class="w-auto p-0 z-[250]">
										<Calendar type="single" bind:value={requestDate} captionLayout="dropdown" />
									</Popover.Content>
								</Popover.Root>
							</div>
							<div class="space-y-2">
								<Label>요청내용</Label>
								<Textarea
									bind:value={requestContent}
									class="resize-none w-full"
									rows={3}
									placeholder="요청내용을 입력하세요."
								/>
							</div>
						</div>
						<div class="space-y-4 flex-1">
							<div class="space-y-2 w-full">
								<Label>대응일자</Label>
								<Popover.Root bind:open={responseDateOpen}>
									<Popover.Trigger class="w-full">
										{#snippet child({ props })}
											<Button
												variant="outline"
												class={cn(
													'w-full justify-start text-start font-normal',
													!responseDate && 'text-muted-foreground'
												)}
												{...props}
											>
												<CalendarIcon class="me-2 size-4" />
												{responseDate
													? dateFormatter.format(responseDate.toDate(getLocalTimeZone()))
													: '대응일자 선택'}
											</Button>
										{/snippet}
									</Popover.Trigger>
									<Popover.Content class="w-auto p-0 z-[250]">
										<Calendar type="single" bind:value={responseDate} captionLayout="dropdown" />
									</Popover.Content>
								</Popover.Root>
							</div>
							<div class="space-y-2">
								<Label>대응내용</Label>
								<Textarea
									bind:value={responseContent}
									class="resize-none w-full"
									rows={3}
									placeholder="대응내용을 입력하세요."
								/>
							</div>
						</div>
					</div>

					<!-- 첨부파일 -->
					<Field class="mt-4">
						<FieldLabel>첨부파일</FieldLabel>
						<FieldContent>
							{#if asFile}
								<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
									<div class="flex items-center gap-2 truncate">
										<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
										<span class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide"
											>{asFile.name}</span
										>
										<span class="text-xs text-muted-foreground">(새 파일)</span>
									</div>
									<div class="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-destructive hover:text-destructive"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												asFile = null;
											}}
										>
											<XIcon class="h-4 w-4" />
											<span class="sr-only">Remove</span>
										</Button>
									</div>
								</div>
							{:else if existingFileName}
								<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
									<div class="flex items-center gap-2 truncate">
										<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
										{#if existingFileListId}
											<a
												href="/api/files/{existingFileListId}"
												class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline"
												download
											>
												{existingFileName}
											</a>
										{:else}
											<span class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide"
												>{existingFileName}</span
											>
										{/if}
									</div>
									<div class="flex items-center gap-1">
										{#if existingFileListId}
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={() => {
													window.open(`/api/files/${existingFileListId}`, '_blank');
												}}
											>
												<DownloadIcon class="h-4 w-4" />
												<span class="sr-only">Download</span>
											</Button>
										{/if}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-destructive hover:text-destructive"
											onclick={removeFile}
										>
											<XIcon class="h-4 w-4" />
											<span class="sr-only">Remove</span>
										</Button>
									</div>
									<input type="hidden" name="removeAsFile" value={existingFileListId === null} />
								</div>
							{:else}
								<div class="flex items-center justify-center w-full">
									<label
										for="home-as-file"
										class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25"
									>
										<div class="flex flex-col items-center justify-center pt-5 pb-6">
											<FileIcon class="w-8 h-8 mb-2 text-muted-foreground" />
											<p class="text-sm text-muted-foreground">
												<span class="font-semibold">파일 업로드</span>
											</p>
											<p class="text-xs text-muted-foreground">PDF, 이미지 등</p>
										</div>
										<input
											id="home-as-file"
											name="asFile"
											type="file"
											class="hidden"
											onchange={handleFileChange}
										/>
									</label>
								</div>
							{/if}
						</FieldContent>
					</Field>

					{#if validationError}
						<div class="text-sm text-destructive">{validationError}</div>
					{/if}
				</div>
			</div>

			<div class="px-6 pb-6">
				<Dialog.Footer class="flex-row justify-end gap-2">
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							open = false;
						}}
					>
						취소
					</Button>
					<Button
						type="submit"
						disabled={submitting ||
							(asType === 'contract' && !selectedContractId) ||
							(asType === 'single' && !selectedClientId)}
					>
						{#if submitting}
							<Spinner class="size-4" />
						{/if}
						수정 저장
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- 계약 수정 Dialog -->
<HomeContractDialog
	bind:open={contractEditDialogOpen}
	bind:contract={editingContractRow}
	clientList={clientList.length > 0
		? clientList
		: internalClientList.map((c) => ({
				id: c.id,
				name: c.customerName,
				name1: c.name1,
				name2: c.name2,
				name3: c.name3,
				name4: c.name4,
				name5: c.name5,
				mainContactName: c.mainContactName,
				mainContactPosition: c.mainContactPosition,
				mainContactPhone: c.mainContactPhone,
				mainContactEmail: c.mainContactEmail,
				subContactName: c.subContactName,
				subContactPosition: c.subContactPosition,
				subContactPhone: c.subContactPhone,
				subContactEmail: c.subContactEmail,
				address: c.address
			}))}
	{productList}
	{firmwareList}
/>

<!-- 고객사 수정 Dialog -->
<Dialog.Root
	bind:open={clientEditDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			editingClientRow = null;
			editingClientId = null;
		}
	}}
>
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 z-[150]">
		<div class="px-6 pt-6">
			<Dialog.Header>
				<Dialog.Title>고객사 수정</Dialog.Title>
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action="/clients?/updateClient"
			use:enhance={({ formData, cancel }) => {
				if (newCustomerBizLicenseFile) {
					submittingClient = true;
				}

				if (!newCustomerName || !newCustomerName.trim()) {
					validationError = '고객사명을 입력하세요.';
					setTimeout(() => {
						validationError = null;
					}, 5000);
					cancel();
					submittingClient = false;
					return;
				}

				if (newCustomerMainContactPhone && !validatePhone(newCustomerMainContactPhone)) {
					mainContactPhoneError = '올바른 전화번호 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerMainContactEmail && !validateEmail(newCustomerMainContactEmail)) {
					mainContactEmailError = '올바른 이메일 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerSubContactPhone && !validatePhone(newCustomerSubContactPhone)) {
					subContactPhoneError = '올바른 전화번호 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerSubContactEmail && !validateEmail(newCustomerSubContactEmail)) {
					subContactEmailError = '올바른 이메일 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerFax && !validatePhone(newCustomerFax)) {
					faxError = '올바른 전화번호 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}

				validationError = null;

				if (editingClientRow) {
					// Use editingClientId (set when loading) or fallback to clientId from API response
					formData.set('id', String(editingClientId || editingClientRow.clientId));
				}

				formData.set('name1', newCustomerName || '');
				formData.set('name2', newCustomerSource || '');
				formData.set('name3', newCustomerItem3 || '');
				formData.set('name4', newCustomerItem4 || '');
				formData.set('name5', newCustomerItem5 || '');
				formData.set('businessNumber', newCustomerBusinessNumber || '');
				formData.set('zipCode', newCustomerZipCode || '');
				formData.set('address', newCustomerAddress || '');
				formData.set('fax', newCustomerFax || '');
				formData.set('mainContactName', newCustomerMainContactName || '');
				formData.set('mainContactPosition', newCustomerMainContactPosition || '');
				formData.set('mainContactPhone', newCustomerMainContactPhone || '');
				formData.set('mainContactEmail', newCustomerMainContactEmail || '');
				formData.set('subContactName', newCustomerSubContactName || '');
				formData.set('subContactPosition', newCustomerSubContactPosition || '');
				formData.set('subContactPhone', newCustomerSubContactPhone || '');
				formData.set('subContactEmail', newCustomerSubContactEmail || '');

				if (editingClientRow) {
					const originalFileListId = editingClientRow.registrationFileListId;
					if (
						originalFileListId &&
						!existingCustomerRegistrationFileListId &&
						!newCustomerBizLicenseFile
					) {
						formData.set('removeRegistrationFile', 'true');
					}
				}
				if (newCustomerBizLicenseFile) {
					formData.set('registrationFile', newCustomerBizLicenseFile);
				}

				return async ({ result, update }) => {
					submittingClient = false;

					if (result.type === 'success') {
						editingClientRow = null;
						editingClientId = null;
						validationError = null;

						clientEditDialogOpen = false;
						await tick();

						await update({ reset: false });
						await invalidateAll();
						await forceRefreshOptions();

						toast.success('고객사가 수정되었습니다.');
					} else if (result.type === 'failure') {
						const errorMessage = result.data?.message || '수정에 실패했습니다.';
						toast.error(String(errorMessage));
						console.error('Form action failed:', result);
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				<div class="space-y-4">
					<div class="space-y-3">
						<Label>고객사명</Label>
						<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
							<Input name="name1" placeholder="항목 1" bind:value={newCustomerName} />
							<Input name="name2" placeholder="항목 2" bind:value={newCustomerSource} />
							<Input name="name3" placeholder="항목 3" bind:value={newCustomerItem3} />
							<Input name="name4" placeholder="항목 4" bind:value={newCustomerItem4} />
							<Input name="name5" placeholder="항목 5" bind:value={newCustomerItem5} />
						</div>
					</div>

					<Separator />

					<Field>
						<FieldLabel>사업자등록번호</FieldLabel>
						<FieldContent>
							<Input
								name="businessNumber"
								placeholder="123-45-67890"
								bind:value={newCustomerBusinessNumber}
							/>
						</FieldContent>
					</Field>

					<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
						<Field class="md:col-span-7">
							<FieldLabel>주소</FieldLabel>
							<FieldContent>
								<Input
									name="address"
									placeholder="서울특별시 강남구..."
									bind:value={newCustomerAddress}
								/>
							</FieldContent>
						</Field>
						<Field class="md:col-span-2">
							<FieldLabel>우편번호</FieldLabel>
							<FieldContent>
								<Input name="zipCode" placeholder="12345" bind:value={newCustomerZipCode} />
							</FieldContent>
						</Field>
						<Field class="md:col-span-3">
							<FieldLabel>FAX</FieldLabel>
							<FieldContent>
								<div class="flex flex-col gap-1">
									<Input
										name="fax"
										placeholder="02-123-4567"
										bind:value={newCustomerFax}
										aria-invalid={faxError ? 'true' : 'false'}
										oninput={(e) => {
											const formatted = formatPhoneNumber(e.currentTarget.value);
											newCustomerFax = formatted;
											if (faxError) {
												faxError = null;
											}
										}}
										onblur={() => {
											faxError = validatePhone(newCustomerFax)
												? null
												: '올바른 전화번호 형식이 아닙니다.';
										}}
									/>
									{#if faxError}
										<p class="text-xs text-destructive">{faxError}</p>
									{/if}
								</div>
							</FieldContent>
						</Field>
					</div>

					<Separator />

					<div class="space-y-3">
						<Label>담당자(주)</Label>
						<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
							<Input
								name="mainContactName"
								placeholder="이름"
								bind:value={newCustomerMainContactName}
							/>
							<Input
								name="mainContactPosition"
								placeholder="직급/직책"
								bind:value={newCustomerMainContactPosition}
							/>
							<div class="flex flex-col gap-1">
								<Input
									name="mainContactPhone"
									placeholder="연락처"
									bind:value={newCustomerMainContactPhone}
									aria-invalid={mainContactPhoneError ? 'true' : 'false'}
									oninput={(e) => {
										const formatted = formatPhoneNumber(e.currentTarget.value);
										newCustomerMainContactPhone = formatted;
										if (mainContactPhoneError) {
											mainContactPhoneError = null;
										}
									}}
									onblur={() => {
										mainContactPhoneError = validatePhone(newCustomerMainContactPhone)
											? null
											: '올바른 전화번호 형식이 아닙니다.';
									}}
								/>
								{#if mainContactPhoneError}
									<p class="text-xs text-destructive">{mainContactPhoneError}</p>
								{/if}
							</div>
							<div class="flex flex-col gap-1">
								<Input
									name="mainContactEmail"
									type="email"
									placeholder="이메일"
									bind:value={newCustomerMainContactEmail}
									aria-invalid={mainContactEmailError ? 'true' : 'false'}
									onblur={() => {
										mainContactEmailError = validateEmail(newCustomerMainContactEmail)
											? null
											: '올바른 이메일 형식이 아닙니다.';
									}}
								/>
								{#if mainContactEmailError}
									<p class="text-xs text-destructive">{mainContactEmailError}</p>
								{/if}
							</div>
						</div>
					</div>

					<Separator />

					<div class="space-y-3">
						<Label>담당자(부)</Label>
						<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
							<Input
								name="subContactName"
								placeholder="이름"
								bind:value={newCustomerSubContactName}
							/>
							<Input
								name="subContactPosition"
								placeholder="직급/직책"
								bind:value={newCustomerSubContactPosition}
							/>
							<div class="flex flex-col gap-1">
								<Input
									name="subContactPhone"
									placeholder="연락처"
									bind:value={newCustomerSubContactPhone}
									aria-invalid={subContactPhoneError ? 'true' : 'false'}
									oninput={(e) => {
										const formatted = formatPhoneNumber(e.currentTarget.value);
										newCustomerSubContactPhone = formatted;
										if (subContactPhoneError) {
											subContactPhoneError = null;
										}
									}}
									onblur={() => {
										subContactPhoneError = validatePhone(newCustomerSubContactPhone)
											? null
											: '올바른 전화번호 형식이 아닙니다.';
									}}
								/>
								{#if subContactPhoneError}
									<p class="text-xs text-destructive">{subContactPhoneError}</p>
								{/if}
							</div>
							<div class="flex flex-col gap-1">
								<Input
									name="subContactEmail"
									type="email"
									placeholder="이메일"
									bind:value={newCustomerSubContactEmail}
									aria-invalid={subContactEmailError ? 'true' : 'false'}
									onblur={() => {
										subContactEmailError = validateEmail(newCustomerSubContactEmail)
											? null
											: '올바른 이메일 형식이 아닙니다.';
									}}
								/>
								{#if subContactEmailError}
									<p class="text-xs text-destructive">{subContactEmailError}</p>
								{/if}
							</div>
						</div>
					</div>

					{#if validationError}
						<div class="text-sm text-destructive">{validationError}</div>
					{/if}
				</div>
			</div>

			<div class="px-6 pb-6">
				<Dialog.Footer class="flex-row justify-end gap-2">
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							editingClientRow = null;
							editingClientId = null;
							validationError = null;
							clientEditDialogOpen = false;
						}}
					>
						취소
					</Button>
					<Button type="submit" disabled={submittingClient || !newCustomerName?.trim()}>
						{#if submittingClient}
							<Spinner class="size-4" />
						{/if}
						고객사 수정
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
