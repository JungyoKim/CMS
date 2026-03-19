<script lang="ts">
	import {
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type ColumnDef,
		type PaginationState,
		type Row,
		type SortingState
	} from '@tanstack/table-core';
	import type { Schema } from './schemas.js';
	import type { Attachment } from 'svelte/attachments';
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { FlexRender, renderSnippet } from '$lib/components/ui/data-table/index.js';
	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';
	import { Button } from '$lib/components/ui/button/index.js';
	import { DragDropProvider } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Field, FieldLabel, FieldContent } from '$lib/components/ui/field/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { cn } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { invalidate } from '$app/navigation';
	import {
		DateFormatter,
		type DateValue,
		getLocalTimeZone,
		parseDate,
		today
	} from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CheckIcon from '@lucide/svelte/icons/check';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import FileIcon from '@tabler/icons-svelte/icons/file';
	import XIcon from '@tabler/icons-svelte/icons/x';
	import DownloadIcon from '@tabler/icons-svelte/icons/download';
	import FileUploadField from '$lib/components/ui/file-upload-field.svelte';
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import PlusIcon from '@tabler/icons-svelte/icons/plus';
	import {
		dateFormatter,
		dateValueToString,
		stringToDateValue,
		formatPhoneNumber,
		validateEmail,
		validatePhone,
		parseCurrency,
		formatCurrency
	} from './data-table/utils.js';
	import HomeASDialogComponent from './home-as-dialog.svelte';

	type RoomEntry = {
		id: string;
		checked: boolean;
		building: string;
		room: string;
		roomId: string;
		memo: string;
	};

	type RepeaterEntry = {
		id: string;
		checked: boolean;
		repeaterId: string;
		room: string;
		memo: string;
	};

	type DeliveryProductEntry = {
		id: string;
		checked: boolean;
		productId: string;
		quantity: number;
		firmwareId: string;
		memo: string;
		openProduct: boolean;
		openFirmware: boolean;
	};

	type ASEntry = {
		id: string;
		requestDate: DateValue | undefined;
		requestContent: string;
		responseDate: DateValue | undefined;
		responseContent: string;
		cost: string;
		isCompleted: boolean;
		isOpen: boolean;
		requestDateOpen: boolean;
		responseDateOpen: boolean;
	};

	type DocumentEntry = {
		id: string;
		content: string;
		file: File | null;
		fileName?: string;
		fileListId?: string;
		checked: boolean;
	};

	let {
		data,
		clientList = [],
		productList = [],
		firmwareList = []
	}: {
		data: Schema[];
		clientList?: Array<{
			id: number;
			name: string;
			name1: string | null;
			name2: string | null;
			name3: string | null;
			name4: string | null;
			name5: string | null;
			mainContactName: string | null;
			mainContactPosition: string | null;
			mainContactPhone: string | null;
			mainContactEmail: string | null;
			subContactName: string | null;
			subContactPosition: string | null;
			subContactPhone: string | null;
			subContactEmail: string | null;
			address: string | null;
		}>;
		productList?: Array<{
			id: number;
			name: string;
		}>;
		firmwareList?: Array<{
			id: number;
			name: string;
		}>;
	} = $props();

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);

	// 홈 화면용 AS 수정 Dialog 상태
	let homeASDialogOpen = $state(false);
	let homeASEditingData = $state<any>(null);
	let homeContractDialogScrollContainer: HTMLDivElement | null = null;
	let validationError = $state<string | null>(null);
	let submittingHomeAS = $state(false);
	let loadingClientId = $state<number | null>(null);

	// 기존 계약 관련 변수 (하위 호환성 유지)
	let homeContractEditingRow = $state<Schema | null>(null);

	// 홈 화면용 계약 폼 상태 변수들
	let homeContractName = $state('');
	let homeContractStatus = $state('active');
	let homeContractDate = $state<DateValue | undefined>(undefined);
	let homeContractTerminationDate = $state<DateValue | undefined>(undefined);
	let homeContractPreSalesDate = $state<DateValue | undefined>(undefined);
	let homeContractAmount = $state('');
	let homeContractDownPayment = $state('');
	let homeContractInterimPayment = $state('');
	let homeContractBalance = $state('');
	let homeContractTaxInvoiceDate = $state<DateValue | undefined>(undefined);
	let homeContractMaintenanceAmount = $state('');
	let homeContractBillingDate = $state('');
	let homeContractManagerName = $state('');
	let homeContractManagerPosition = $state('');
	let homeContractManagerPhone = $state('');
	let homeContractManagerEmail = $state('');
	let homeContractConstructionStartDate = $state<DateValue | undefined>(undefined);
	let homeContractConstructionEndDate = $state<DateValue | undefined>(undefined);
	let homeContractInstallPartner = $state('');
	let homeContractInstallName = $state('');
	let homeContractInstallPhone = $state('');
	let homeContractBuildingInfo = $state('');
	let homeContractCustomer = $state('');
	let homeContractOrderer = $state('');
	let homeContractCustomerContact = $state('');
	let homeContractCustomerPosition = $state('');
	let homeContractCustomerPhone = $state('');
	let homeContractCustomerEmail = $state('');
	let homeContractCustomerAddress = $state('');
	let homeContractOrdererContact = $state('');
	let homeContractOrdererPosition = $state('');
	let homeContractOrdererPhone = $state('');
	let homeContractOrdererEmail = $state('');
	let homeContractOrdererAddress = $state('');
	let homeContractAttachmentFile = $state<File | null>(null);
	let existingHomeContractAttachmentFileName = $state<string | null>(null);
	let existingHomeContractAttachmentFileListId = $state<string | null>(null);
	let homeContractRooms = $state<RoomEntry[]>([]);
	let homeContractRepeaters = $state<RepeaterEntry[]>([]);
	let homeContractDeliveryProducts = $state<DeliveryProductEntry[]>([]);
	let homeContractASRecords = $state<ASEntry[]>([]);
	let homeContractDocuments = $state<DocumentEntry[]>([]);
	let homeContractDateOpen = $state(false);
	let homeContractTerminationDateOpen = $state(false);
	let homeContractPreSalesDateOpen = $state(false);
	let homeContractTaxInvoiceDateOpen = $state(false);
	let homeContractConstructionStartDateOpen = $state(false);
	let homeContractConstructionEndDateOpen = $state(false);
	let homeOpenCustomer = $state(false);
	let homeOpenOrderer = $state(false);
	let homeOpenRoomId = $state(false);
	let homeOpenRepeaterId = $state(false);
	let homeOpenDeliveryProducts = $state(false);
	let homeOpenDocumentDialog = $state(false);
	let homeCustomerTriggerRef: HTMLButtonElement | null = $state(null);
	let homeOrdererTriggerRef: HTMLButtonElement | null = $state(null);
	let homeEditingDocument = $state<DocumentEntry | null>(null);
	let homeNewDocumentContent = $state('');
	let homeNewDocumentFile = $state<File | null>(null);
	let homeExistingDocumentFileName = $state<string | null>(null);
	let homeExistingDocumentFileListId = $state<string | null>(null);

	// 제품 수정 관련 상태
	let productEditDialogOpen = $state(false);
	let editingProductId = $state<number | null>(null);
	let editingProductRow = $state<Schema | null>(null);
	let loadingProductId = $state<number | null>(null);
	let submittingProduct = $state(false);

	// 제품 폼 상태
	let newProductName = $state('');
	let newProductCode = $state('');
	let newProductVersion = $state('');
	let newProductPrice = $state('');
	let newProductDescription = $state('');
	let newProductFirmwareId = $state('');
	let newProductFile = $state<File | null>(null);
	let existingProductFileName = $state<string | null>(null);
	let existingProductFileListId = $state<string | null>(null);
	let productFirmwareOpen = $state(false);
	let productFirmwareTriggerRef = $state<HTMLButtonElement>(null!);

	// 제품 재고 상태
	type InventoryEntry = {
		id: string;
		checked: boolean;
		type: string; // 'in' | 'out'
		content: string;
		date: DateValue | undefined;
		quantity: string;
		dateOpen?: boolean;
	};
	let productInventory = $state<InventoryEntry[]>([]);
	let openInventoryDialog = $state(false);

	let productTotalQuantity = $derived.by(() => {
		return productInventory.reduce((total, inv) => {
			const qty = parseInt(inv.quantity) || 0;
			if (inv.type === 'in') {
				return total + qty;
			} else if (inv.type === 'out') {
				return total - qty;
			}
			return total;
		}, 0);
	});

	// 잔금 자동 계산: 총계약금액 - (계약금 + 중도금)
	$effect(() => {
		const total = parseInt(homeContractAmount) || 0;
		const downPayment = parseInt(homeContractDownPayment) || 0;
		const interimPayment = parseInt(homeContractInterimPayment) || 0;
		const balance = total - (downPayment + interimPayment);
		homeContractBalance = balance >= 0 ? String(balance) : '';
	});

	// Define columns
	const columns = $derived.by(() => {
		return [
			{
				id: 'drag',
				header: () => null,
				cell: () => renderSnippet(DragHandle)
			},
			{
				accessorKey: 'customerName',
				header: '고객명',
				cell: ({ row }) => {
					// @ts-expect-error - Schema may not have these fields yet
					return row.original.customerName || '-';
				}
			},
			{
				accessorKey: 'requestDate',
				header: '요청일',
				cell: ({ row }) => {
					// @ts-expect-error - Schema may not have these fields yet
					return row.original.requestDate || '-';
				}
			},
			{
				accessorKey: 'requestContent',
				header: '내용',
				cell: ({ row }) => {
					// @ts-expect-error - Schema may not have these fields yet
					return row.original.requestContent || '-';
				}
			},
			{
				accessorKey: 'responseContent',
				header: '대응내역',
				cell: ({ row }) => {
					// @ts-expect-error - Schema may not have these fields yet
					return row.original.responseContent || '-';
				}
			},
			{
				accessorKey: 'responseDate',
				header: '처리일',
				cell: ({ row }) => {
					// @ts-expect-error - Schema may not have these fields yet
					return row.original.responseDate || '-';
				}
			}
		] as ColumnDef<Schema>[];
	});

	const table = createSvelteTable({
		get data() {
			return data;
		},
		get columns() {
			return columns;
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			}
		},
		getRowId: (row) => row.id.toString(),
		enableRowSelection: false,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		}
	});

	// 홈 화면용 함수들
	function addHomeRoomRow() {
		homeContractRooms = [
			...homeContractRooms,
			{ id: Math.random().toString(), checked: false, building: '', room: '', roomId: '', memo: '' }
		];
	}

	function addHomeRepeaterRow() {
		homeContractRepeaters = [
			...homeContractRepeaters,
			{ id: Math.random().toString(), checked: false, repeaterId: '', room: '', memo: '' }
		];
	}

	function addHomeDeliveryProductRow() {
		homeContractDeliveryProducts = [
			...homeContractDeliveryProducts,
			{
				id: Math.random().toString(),
				checked: false,
				productId: '',
				quantity: 0,
				firmwareId: '',
				memo: '',
				openProduct: false,
				openFirmware: false
			}
		];
	}

	function addHomeASRecord() {
		homeContractASRecords = [
			...homeContractASRecords,
			{
				id: Math.random().toString(),
				requestDate: undefined,
				requestContent: '',
				responseDate: undefined,
				responseContent: '',
				cost: '',
				isCompleted: false,
				requestDateOpen: false,
				responseDateOpen: false,
				isOpen: true
			}
		];
	}

	function removeSelectedHomeRooms() {
		homeContractRooms = homeContractRooms.filter((r) => !r.checked);
	}

	function removeSelectedHomeRepeaters() {
		homeContractRepeaters = homeContractRepeaters.filter((r) => !r.checked);
	}

	function removeSelectedHomeDeliveryProducts() {
		homeContractDeliveryProducts = homeContractDeliveryProducts.filter((r) => !r.checked);
	}

	// 홈 계약 폼 초기화 함수
	function resetHomeContractForm() {
		homeContractName = '';
		homeContractStatus = 'active';
		homeContractDate = undefined;
		homeContractTerminationDate = undefined;
		homeContractPreSalesDate = undefined;
		homeContractAmount = '';
		homeContractDownPayment = '';
		homeContractInterimPayment = '';
		homeContractBalance = '';
		homeContractTaxInvoiceDate = undefined;
		homeContractMaintenanceAmount = '';
		homeContractBillingDate = '';
		homeContractManagerName = '';
		homeContractManagerPosition = '';
		homeContractManagerPhone = '';
		homeContractManagerEmail = '';
		homeContractConstructionStartDate = undefined;
		homeContractConstructionEndDate = undefined;
		homeContractInstallPartner = '';
		homeContractInstallName = '';
		homeContractInstallPhone = '';
		homeContractBuildingInfo = '';
		homeContractCustomer = '';
		homeContractOrderer = '';
		homeContractCustomerContact = '';
		homeContractCustomerPosition = '';
		homeContractCustomerPhone = '';
		homeContractCustomerEmail = '';
		homeContractCustomerAddress = '';
		homeContractOrdererContact = '';
		homeContractOrdererPosition = '';
		homeContractOrdererPhone = '';
		homeContractOrdererEmail = '';
		homeContractOrdererAddress = '';
		homeContractAttachmentFile = null;
		existingHomeContractAttachmentFileName = null;
		existingHomeContractAttachmentFileListId = null;
		homeContractRooms = [];
		homeContractRepeaters = [];
		homeContractDeliveryProducts = [];
		homeContractASRecords = [];
		homeContractDocuments = [];
		homeContractEditingRow = null;
		validationError = null;
	}

	// 제품 수정 관련 함수들
	function resetProductEditDialog() {
		newProductName = '';
		newProductCode = '';
		newProductVersion = '';
		newProductPrice = '';
		newProductDescription = '';
		newProductFirmwareId = '';
		newProductFile = null;
		existingProductFileName = null;
		existingProductFileListId = null;
		productInventory = [];
		editingProductRow = null;
		editingProductId = null;
		validationError = null;
	}

	function addInventoryRow() {
		productInventory = [
			...productInventory,
			{
				id: Math.random().toString(),
				checked: false,
				type: 'in',
				content: '',
				date: undefined,
				quantity: '',
				dateOpen: false
			}
		];
	}

	function removeSelectedInventory() {
		const scrollPosition = window.scrollY || document.documentElement.scrollTop;
		productInventory = productInventory.filter((item) => !item.checked);
		requestAnimationFrame(() => {
			window.scrollTo(0, scrollPosition);
		});
	}

	function handleProductFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			newProductFile = input.files[0];
		}
	}

	function removeProductFile() {
		newProductFile = null;
	}

	function removeHomeASRecord(id: string) {
		homeContractASRecords = homeContractASRecords.filter((r) => r.id !== id);
	}

	function openAddHomeDocumentDialog() {
		homeEditingDocument = null;
		homeNewDocumentContent = '';
		homeNewDocumentFile = null;
		homeExistingDocumentFileName = null;
		homeExistingDocumentFileListId = null;
		homeOpenDocumentDialog = true;
	}

	function openEditHomeDocumentDialog(doc: DocumentEntry) {
		homeEditingDocument = doc;
		homeNewDocumentContent = doc.content || '';
		homeNewDocumentFile = doc.file || null;
		homeExistingDocumentFileName = doc.fileName || null;
		homeExistingDocumentFileListId = doc.fileListId || null;
		homeOpenDocumentDialog = true;
	}

	async function saveHomeDocument() {
		if (!homeNewDocumentContent.trim() && !homeNewDocumentFile && !homeExistingDocumentFileListId) {
			toast('내용 또는 파일을 입력해주세요.');
			return;
		}

		const isAdding = !homeEditingDocument;
		const editingDoc = homeEditingDocument;

		if (editingDoc) {
			// 수정
			homeContractDocuments = homeContractDocuments.map((doc) =>
				doc.id === editingDoc.id
					? {
							...doc,
							content: homeNewDocumentContent,
							file: homeNewDocumentFile,
							fileName: homeNewDocumentFile
								? homeNewDocumentFile.name
								: homeExistingDocumentFileName || undefined,
							fileListId: homeNewDocumentFile
								? undefined
								: homeExistingDocumentFileListId || undefined
						}
					: doc
			);
		} else {
			// 추가
			homeContractDocuments = [
				...homeContractDocuments,
				{
					id: Math.random().toString(),
					content: homeNewDocumentContent,
					file: homeNewDocumentFile,
					fileName: homeNewDocumentFile ? homeNewDocumentFile.name : undefined,
					fileListId: undefined,
					checked: false
				} as DocumentEntry
			];
		}

		homeOpenDocumentDialog = false;
		homeEditingDocument = null;
		homeNewDocumentContent = '';
		homeNewDocumentFile = null;
		homeExistingDocumentFileName = null;
		homeExistingDocumentFileListId = null;

		// 문서 추가 시 스크롤을 최하단으로 이동
		if (isAdding && homeContractDialogScrollContainer) {
			await tick();
			homeContractDialogScrollContainer.scrollTop = homeContractDialogScrollContainer.scrollHeight;
		}
	}

	async function removeSelectedHomeDocuments() {
		const currentScrollTop = homeContractDialogScrollContainer?.scrollTop ?? 0;
		homeContractDocuments = homeContractDocuments.filter((r) => !r.checked);
		await tick();
		if (homeContractDialogScrollContainer) {
			homeContractDialogScrollContainer.scrollTop = currentScrollTop;
		}
	}

	function downloadFile(fileOrId: File | string, fileName?: string) {
		if (fileOrId instanceof File) {
			// File 객체인 경우
			const url = URL.createObjectURL(fileOrId);
			const link = document.createElement('a');
			link.href = url;
			link.download = fileOrId.name;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} else {
			// fileListId인 경우
			const link = document.createElement('a');
			link.href = `/api/files/${fileOrId}`;
			link.download = fileName || '';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			homeContractAttachmentFile = input.files[0];
		}
	}

	// 고객사 목록을 clientList에서 변환
	const customers: Array<{ value: string; label: string; client?: (typeof clientList)[0] }> =
		$derived(
			clientList.map((client) => {
				const nameParts = [
					client.name1,
					client.name2,
					client.name3,
					client.name4,
					client.name5
				].filter(Boolean);
				const name = nameParts.join(' ') || `고객사 ${client.id}`;
				return {
					value: String(client.id),
					label: name,
					client: client
				};
			})
		);

	// 제품 목록을 productList에서 변환
	const productOptions: Array<{ value: string; label: string }> = $derived(
		productList.map((product) => ({
			value: String(product.id),
			label: product.name || `제품 ${product.id}`
		}))
	);

	// 펌웨어 목록을 firmwareList에서 변환
	const firmwareOptions: Array<{ value: string; label: string }> = $derived(
		firmwareList.map((firmware) => ({
			value: String(firmware.id),
			label: firmware.name || `펌웨어 ${firmware.id}`
		}))
	);

	// 계약 데이터 로드
	$effect(() => {
		if (homeContractEditingRow) {
			const row = homeContractEditingRow;
			// @ts-expect-error - Schema may not have these fields
			homeContractName = row.name || '';
			homeContractStatus = (row.status as string) || 'active';
			// @ts-expect-error
			homeContractDate = stringToDateValue(row.contractDate);
			// @ts-expect-error
			homeContractTerminationDate = stringToDateValue(row.cancelDate);
			// @ts-expect-error
			homeContractPreSalesDate = stringToDateValue(row.salesStartDate);
			// @ts-expect-error
			homeContractAmount = row.deposit ? formatCurrency(String(row.deposit)) : '';
			// @ts-expect-error
			homeContractDownPayment = row.prepayment ? formatCurrency(String(row.prepayment)) : '';
			// @ts-expect-error
			homeContractInterimPayment = row.interimPayment
				? formatCurrency(String(row.interimPayment))
				: '';
			// @ts-expect-error
			homeContractTaxInvoiceDate = stringToDateValue(row.taxInvoiceDate);
			// @ts-expect-error
			homeContractMaintenanceAmount = row.maintenanceMonthlyAmount
				? formatCurrency(String(row.maintenanceMonthlyAmount))
				: '';
			// @ts-expect-error
			homeContractBillingDate = row.billingDayOfMonth || '';
			// @ts-expect-error
			homeContractManagerName = row.managerName || '';
			// @ts-expect-error
			homeContractManagerPosition = row.managerPosition || '';
			// @ts-expect-error
			homeContractManagerPhone = row.managerPhone || '';
			// @ts-expect-error
			homeContractManagerEmail = row.managerEmail || '';
			// @ts-expect-error
			homeContractConstructionStartDate = stringToDateValue(row.buildStartDate);
			// @ts-expect-error
			homeContractConstructionEndDate = stringToDateValue(row.buildEndDate);
			// @ts-expect-error
			homeContractInstallPartner = row.installerCompany || '';
			// @ts-expect-error
			homeContractInstallName = row.installerName || '';
			// @ts-expect-error
			homeContractInstallPhone = row.installerPhone || '';
			// @ts-expect-error
			homeContractBuildingInfo = row.buildingInfo || '';
			// @ts-expect-error
			homeContractCustomer = row.clientId ? String(row.clientId) : '';
			// @ts-expect-error
			homeContractOrderer = row.orderClientId ? String(row.orderClientId) : '';
			// @ts-expect-error
			homeContractCustomerContact = row.customerContactName || '';
			// @ts-expect-error
			homeContractCustomerPosition = row.customerContactPosition || '';
			// @ts-expect-error
			homeContractCustomerPhone = row.customerContactPhone || '';
			// @ts-expect-error
			homeContractCustomerEmail = row.customerContactEmail || '';
			// @ts-expect-error
			homeContractCustomerAddress = row.customerAddress || '';
			// @ts-expect-error
			homeContractOrdererContact = row.ordererContactName || '';
			// @ts-expect-error
			homeContractOrdererPosition = row.ordererContactPosition || '';
			// @ts-expect-error
			homeContractOrdererPhone = row.ordererContactPhone || '';
			// @ts-expect-error
			homeContractOrdererEmail = row.ordererContactEmail || '';
			// @ts-expect-error
			homeContractOrdererAddress = row.ordererAddress || '';
			// @ts-expect-error
			existingHomeContractAttachmentFileName = row.attachmentFileName || null;
			// @ts-expect-error
			existingHomeContractAttachmentFileListId = row.attachmentFileListId || null;
			// @ts-expect-error
			homeContractRooms = (row.roomsData || []).map((room: any) => ({
				id: Math.random().toString(),
				checked: false,
				building: room.building || '',
				room: room.room || '',
				roomId: room.roomId || '',
				memo: room.memo || ''
			}));
			// @ts-expect-error
			homeContractRepeaters = (row.repeatersData || []).map((repeater: any) => ({
				id: Math.random().toString(),
				checked: false,
				repeaterId: repeater.repeaterId || '',
				room: repeater.room || '',
				memo: repeater.memo || ''
			}));
			// @ts-expect-error
			homeContractDeliveryProducts = (row.installProductsData || []).map((product: any) => ({
				id: Math.random().toString(),
				checked: false,
				productId: product.productId || '',
				quantity: product.quantity || 0,
				firmwareId: product.firmwareId || '',
				memo: product.memo || '',
				openProduct: false,
				openFirmware: false
			}));
			// @ts-expect-error
			homeContractASRecords = (row.asRecordsData || []).map((record: any) => ({
				id: Math.random().toString(),
				requestDate: stringToDateValue(record.requestDate),
				requestContent: record.requestContent || '',
				responseDate: stringToDateValue(record.responseDate),
				responseContent: record.responseContent || '',
				cost: record.cost || '',
				isCompleted: record.isCompleted || false,
				isOpen: false,
				requestDateOpen: false,
				responseDateOpen: false
			}));
			// @ts-expect-error
			homeContractDocuments = (row.documentsData || []).map((doc: any) => ({
				id: Math.random().toString(),
				content: doc.content || '',
				file: null,
				fileName: doc.fileName || undefined,
				fileListId: doc.fileListId || undefined,
				checked: false
			}));
		}
	});
</script>

{#snippet DragHandle({ attach }: { attach: Attachment })}
	<Button
		{@attach attach}
		variant="ghost"
		size="icon"
		class="text-muted-foreground size-7 hover:bg-transparent"
		onclick={(e) => e.stopPropagation()}
		onmousedown={(e) => e.stopPropagation()}
	>
		<GripVerticalIcon class="text-muted-foreground size-3" />
		<span class="sr-only">Drag to reorder</span>
	</Button>
{/snippet}

{#snippet DraggableRow({ row, index }: { row: Row<Schema>; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: row.original.id,
		index: () => index
	})}

	<Table.Row
		data-state={row.getIsSelected() && 'selected'}
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
		{@attach ref}
		onclick={async (e) => {
			// 체크박스나 버튼 클릭 시에는 dialog를 열지 않음
			const target = e.target as HTMLElement;
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a')) {
				return;
			}
			e.stopPropagation();

			// 이미 홈 화면용 dialog가 열려있으면 다시 열지 않음
			if (homeASDialogOpen) {
				return;
			}
			// @ts-expect-error - Schema may not have asId field
			const asId = row.original.asId || row.original.id;
			if (asId) {
				// AS 데이터를 가져와서 홈 화면용 수정 dialog 열기
				try {
					const response = await fetch(`/api/as/${asId}`);
					if (response.ok) {
						const asData = await response.json();
						homeASEditingData = asData;
						homeASDialogOpen = true;
					} else {
						const errorText = await response.text();
						console.error('[Home AS Table Click] Failed to fetch AS:', errorText);
						toast.error('AS 데이터를 불러올 수 없습니다.');
					}
				} catch (error) {
					console.error('[Home AS Table Click] Error fetching AS data:', error);
					toast.error('AS 데이터를 불러오는 중 오류가 발생했습니다.');
				}
			} else {
				console.error('[Home AS Table Click] No AS ID found in row:', row.original);
				toast.error('AS ID를 찾을 수 없습니다.');
			}
		}}
	>
		{#each row.getVisibleCells() as cell (cell.id)}
			<Table.Cell>
				<FlexRender
					attach={cell.column.id === 'drag' ? handleRef : undefined}
					content={cell.column.columnDef.cell}
					context={cell.getContext()}
				/>
			</Table.Cell>
		{/each}
	</Table.Row>
{/snippet}

<div class="rounded-lg border flex flex-col md:h-full md:min-h-0 overflow-hidden">
	<DragDropProvider
		modifiers={[
			// @ts-expect-error @dnd-kit/abstract types are botched atm
			RestrictToVerticalAxis
		]}
		onDragEnd={(e) => (data = move(data, e))}
	>
		<div class="flex flex-col md:h-full md:min-h-0 overflow-hidden">
			<div class="md:flex-1 md:min-h-0 relative">
				<!-- 헤더 우측 스크롤바 덮개 (UI 개선) -->
				<div
					class="absolute top-0 right-0 w-[20px] h-[41px] bg-muted border-b z-20 pointer-events-none hidden md:block"
				></div>
				<div class="h-full overflow-auto [&>[data-slot=table-container]]:h-full">
					<Table.Root>
						<Table.Header class="bg-muted sticky top-0 z-10">
							{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
								<Table.Row>
									{#each headerGroup.headers as header (header.id)}
										<Table.Head colspan={header.colSpan}>
											{#if !header.isPlaceholder}
												<FlexRender
													content={header.column.columnDef.header}
													context={header.getContext()}
												/>
											{/if}
										</Table.Head>
									{/each}
								</Table.Row>
							{/each}
						</Table.Header>
						<Table.Body class="**:data-[slot=table-cell]:first:w-8">
							{#if table.getRowModel().rows?.length}
								{#each table.getRowModel().rows as row, index (row.id)}
									{@render DraggableRow({ row, index })}
								{/each}
							{:else}
								<Table.Row class="hover:[&,&>svelte-css-wrapper]:[&>th,td]:!bg-transparent">
									<Table.Cell
										colspan={columns.length}
										class="text-center py-8 hover:!bg-transparent"
									>
										<span class="text-muted-foreground text-sm">결과가 없습니다.</span>
									</Table.Cell>
								</Table.Row>
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</div></DragDropProvider
	>
</div>

{#snippet DraggableHomeDocumentRow({ doc, index }: { doc: DocumentEntry; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: doc.id,
		index: () => index
	})}

	<Table.Row
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
		{@attach ref}
		onclick={(e) => {
			// 체크박스나 버튼 클릭 시에는 dialog를 열지 않음
			const target = e.target as HTMLElement;
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a')) {
				return;
			}
			openEditHomeDocumentDialog(doc);
		}}
	>
		<Table.Cell class="py-2 pl-4">
			{@render DragHandle({ attach: handleRef })}
		</Table.Cell>
		<Table.Cell class="py-2" onclick={(e) => e.stopPropagation()}>
			<Checkbox
				checked={doc.checked}
				onCheckedChange={(v) => {
					homeContractDocuments = homeContractDocuments.map((d) =>
						d.id === doc.id ? { ...d, checked: !!v } : d
					);
				}}
			/>
		</Table.Cell>
		<Table.Cell class="py-2">
			<div class="overflow-x-auto whitespace-nowrap scrollbar-hide">
				{doc.content || '-'}
			</div>
		</Table.Cell>
		<Table.Cell class="py-2">
			{#if doc.file}
				<div class="flex items-center gap-2">
					<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
					<button
						type="button"
						class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline text-left"
						onclick={(e) => {
							e.stopPropagation();
							downloadFile(doc.file!);
						}}
					>
						{doc.file.name}
					</button>
				</div>
			{:else if doc.fileListId && doc.fileName}
				<div class="flex items-center gap-2">
					<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
					<a
						href="/api/files/{doc.fileListId}"
						class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline"
						download
						onclick={(e) => e.stopPropagation()}
					>
						{doc.fileName}
					</a>
				</div>
			{:else}
				<span class="text-sm text-muted-foreground">-</span>
			{/if}
		</Table.Cell>
	</Table.Row>
{/snippet}

{#snippet DraggableRoomRow({ room, index }: { room: RoomEntry; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: room.id,
		index: () => index
	})}

	<Table.Row
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
		{@attach ref}
	>
		<Table.Cell class="py-2 pl-4">
			{@render DragHandle({ attach: handleRef })}
		</Table.Cell>
		<Table.Cell class="py-2">
			<Checkbox bind:checked={room.checked} />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={room.building} class="h-8" />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={room.room} class="h-8" />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={room.roomId} class="h-8" />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={room.memo} class="h-8" />
		</Table.Cell>
	</Table.Row>
{/snippet}

{#snippet DraggableRepeaterRow({ repeater, index }: { repeater: RepeaterEntry; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: repeater.id,
		index: () => index
	})}

	<Table.Row
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
		{@attach ref}
	>
		<Table.Cell class="py-2 pl-4">
			{@render DragHandle({ attach: handleRef })}
		</Table.Cell>
		<Table.Cell class="py-2">
			<Checkbox bind:checked={repeater.checked} />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={repeater.repeaterId} class="h-8" />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={repeater.room} class="h-8" />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={repeater.memo} class="h-8" />
		</Table.Cell>
	</Table.Row>
{/snippet}

{#snippet DraggableDeliveryProductRow({
	product,
	index
}: {
	product: DeliveryProductEntry;
	index: number;
})}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: product.id,
		index: () => index
	})}

	<Table.Row
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
		{@attach ref}
	>
		<Table.Cell class="py-2 pl-4">
			{@render DragHandle({ attach: handleRef })}
		</Table.Cell>
		<Table.Cell class="py-2">
			<Checkbox bind:checked={product.checked} />
		</Table.Cell>
		<Table.Cell class="py-2">
			<Popover.Root bind:open={product.openProduct}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							class="w-full justify-between h-8"
							{...props}
							role="combobox"
							aria-expanded={product.openProduct}
							onclick={(e) => {
								e.stopPropagation();
								product.openProduct = !product.openProduct;
							}}
						>
							{product.productId
								? productOptions.find((p) => p.value === product.productId)?.label
								: '제품 선택...'}
							<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content
					align="start"
					class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0"
				>
					<Command.Root>
						<Command.Input placeholder="제품 검색..." />
						<Command.List>
							<Command.Empty>제품을 찾을 수 없습니다.</Command.Empty>
							<Command.Group>
								{#each productOptions as option}
									<Command.Item
										value={`${option.value} ${option.label}`}
										onSelect={() => {
											product.productId = option.value;
											product.openProduct = false;
										}}
										class="flex items-center justify-between group"
									>
										<div class="flex items-center gap-2 flex-1 min-w-0">
											<Check
												class={cn(
													'mr-2 h-4 w-4 shrink-0',
													product.productId === option.value ? 'opacity-100' : 'opacity-0'
												)}
											/>
											<span class="overflow-x-auto whitespace-nowrap scrollbar-hide"
												>{option.label}</span
											>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="h-6 w-6 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
											disabled={loadingProductId === Number(option.value)}
											onclick={async (e) => {
												e.preventDefault();
												e.stopPropagation();
												e.stopImmediatePropagation();
												loadingProductId = Number(option.value);
												try {
													const response = await fetch(`/api/products/${option.value}`);
													if (response.ok) {
														const data = await response.json();
														if (data.product) {
															editingProductId = Number(option.value);
															editingProductRow = {
																id: data.product.id,
																productName: data.product.name || '',
																productCode: data.product.code || '',
																version: data.product.version || '',
																price: data.product.price || 0,
																memo: data.product.memo || '',
																protocolId: data.product.protocolId,
																photoFileName: data.product.photoFileName,
																photoFileListId: data.product.photoFileListId
															} as unknown as Schema;

															newProductName = data.product.name || '';
															newProductCode = data.product.code || '';
															newProductVersion = data.product.version || '';
															newProductPrice = data.product.price
																? String(data.product.price)
																: '';
															newProductDescription = data.product.memo || '';
															newProductFirmwareId = data.product.protocolId
																? String(data.product.protocolId)
																: '';
															existingProductFileName = data.product.photoFileName || null;
															existingProductFileListId = data.product.photoFileListId || null;
															newProductFile = null;

															// 입고/출고 기록 로드
															const inventoryData = data.product.inventoryData || [];
															productInventory = inventoryData.map((inv: any) => ({
																id: Math.random().toString(),
																checked: false,
																type: inv.type || 'in',
																content: inv.content || '',
																date: stringToDateValue(inv.date),
																quantity: inv.quantity ? String(inv.quantity) : '',
																dateOpen: false
															}));

															productEditDialogOpen = true;
															product.openProduct = false;
														} else {
															toast.error('제품 데이터를 불러오는데 실패했습니다.');
														}
													} else {
														toast.error('제품 데이터를 불러오는데 실패했습니다.');
													}
												} catch (error) {
													console.error('Failed to load product:', error);
													toast.error('제품 데이터를 불러오는데 실패했습니다.');
												} finally {
													loadingProductId = null;
												}
											}}
										>
											{#if loadingProductId === Number(option.value)}
												<LoaderIcon class="h-3 w-3 animate-spin" />
											{:else}
												<DotsVerticalIcon class="h-4 w-4" />
											{/if}
											<span class="sr-only">Edit product</span>
										</Button>
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input type="number" bind:value={product.quantity} class="h-8" />
		</Table.Cell>
		<Table.Cell class="py-2 hidden">
			<Popover.Root bind:open={product.openFirmware}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							class="w-full justify-between h-8"
							{...props}
							role="combobox"
							aria-expanded={product.openFirmware}
							onclick={(e) => {
								e.stopPropagation();
								product.openFirmware = !product.openFirmware;
							}}
						>
							{product.firmwareId
								? firmwareOptions.find((f) => f.value === product.firmwareId)?.label
								: '펌웨어 선택...'}
							<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content
					align="start"
					class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0 z-[150]"
				>
					<Command.Root>
						<Command.Input placeholder="펌웨어 검색..." />
						<Command.List>
							<Command.Empty>펌웨어를 찾을 수 없습니다.</Command.Empty>
							<Command.Group>
								{#each firmwareOptions as option}
									<Command.Item
										value={`${option.value} ${option.label}`}
										onSelect={() => {
											product.firmwareId = option.value;
											product.openFirmware = false;
										}}
										class="flex items-center gap-2"
									>
										<Check
											class={cn(
												'mr-2 h-4 w-4',
												product.firmwareId === option.value ? 'opacity-100' : 'opacity-0'
											)}
										/>
										{option.label}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={product.memo} class="h-8" />
		</Table.Cell>
	</Table.Row>
{/snippet}

<HomeASDialogComponent
	bind:open={homeASDialogOpen}
	bind:editingASData={homeASEditingData}
	{clientList}
	{productList}
	{firmwareList}
/>

{#snippet HomeContractForm()}
	<div class="space-y-4">
		<div class="space-y-3">
			<Label>계약명</Label>
			<Input placeholder="계약명을 입력하세요" bind:value={homeContractName} />
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>고객 정보</Label>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
				<div class="col-span-2 md:col-span-2 w-full min-w-0">
					<Popover.Root bind:open={homeOpenCustomer}>
						<Popover.Trigger bind:ref={homeCustomerTriggerRef} class="w-full">
							{#snippet child({ props })}
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={homeOpenCustomer}
									class="w-full justify-between min-w-0 overflow-hidden"
									{...props}
								>
									<span class="flex-1 min-w-0 truncate text-left mr-2">
										{homeContractCustomer
											? customers.find((c) => c.value === homeContractCustomer)?.label
											: '고객사 선택...'}
									</span>
									<ChevronsUpDownIcon class="h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content
							align="start"
							class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0 z-[130]"
						>
							<Command.Root>
								<Command.Input placeholder="고객사 검색..." />
								<Command.List>
									<Command.Empty>고객사를 찾을 수 없습니다.</Command.Empty>
									<Command.Group>
										{#each customers as customer (customer.value)}
											<Command.Item
												value={`${customer.value} ${customer.label}`}
												onSelect={() => {
													homeContractCustomer = customer.value;
													// 고객사 정보 자동 로드
													const selectedClient =
														customer.client ||
														clientList.find((c) => String(c.id) === customer.value);
													if (selectedClient) {
														homeContractCustomerContact = selectedClient.mainContactName || '';
														homeContractCustomerPosition = selectedClient.mainContactPosition || '';
														homeContractCustomerPhone = selectedClient.mainContactPhone || '';
														homeContractCustomerEmail = selectedClient.mainContactEmail || '';
														homeContractCustomerAddress = selectedClient.address || '';
													}
													homeOpenCustomer = false;
													tick().then(() => {
														homeCustomerTriggerRef?.focus();
													});
												}}
												class="flex items-center gap-2"
											>
												<CheckIcon
													class={cn(
														'me-2 size-4',
														homeContractCustomer !== customer.value && 'text-transparent'
													)}
												/>
												{customer.label}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
				<input type="hidden" name="clientId" value={homeContractCustomer} />
				<Input
					name="customerContactName"
					placeholder="담당자"
					bind:value={homeContractCustomerContact}
				/>
				<Input
					name="customerContactPosition"
					placeholder="직급/직책"
					bind:value={homeContractCustomerPosition}
				/>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="flex flex-col gap-1">
					<Input
						name="customerContactPhone"
						placeholder="연락처"
						bind:value={homeContractCustomerPhone}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractCustomerPhone = formatted;
						}}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<Input
						name="customerContactEmail"
						type="email"
						placeholder="이메일"
						bind:value={homeContractCustomerEmail}
					/>
				</div>
				<Input
					name="customerAddress"
					class="md:col-span-2"
					placeholder="주소"
					bind:value={homeContractCustomerAddress}
				/>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>발주처 정보</Label>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
				<div class="col-span-2 md:col-span-2 w-full min-w-0">
					<Popover.Root bind:open={homeOpenOrderer}>
						<Popover.Trigger bind:ref={homeOrdererTriggerRef} class="w-full">
							{#snippet child({ props })}
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={homeOpenOrderer}
									class="w-full justify-between min-w-0 overflow-hidden"
									{...props}
								>
									<span class="flex-1 min-w-0 truncate text-left mr-2">
										{homeContractOrderer
											? customers.find((c) => c.value === homeContractOrderer)?.label
											: '발주처 선택...'}
									</span>
									<ChevronsUpDownIcon class="h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content
							align="start"
							class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0 z-[130]"
						>
							<Command.Root>
								<Command.Input placeholder="발주처 검색..." />
								<Command.List>
									<Command.Empty>발주처를 찾을 수 없습니다.</Command.Empty>
									<Command.Group>
										{#each customers as customer (customer.value)}
											<Command.Item
												value={`${customer.value} ${customer.label}`}
												onSelect={() => {
													homeContractOrderer = customer.value;
													// 발주처 정보 자동 로드
													const selectedClient =
														customer.client ||
														clientList.find((c) => String(c.id) === customer.value);
													if (selectedClient) {
														homeContractOrdererContact = selectedClient.mainContactName || '';
														homeContractOrdererPosition = selectedClient.mainContactPosition || '';
														homeContractOrdererPhone = selectedClient.mainContactPhone || '';
														homeContractOrdererEmail = selectedClient.mainContactEmail || '';
														homeContractOrdererAddress = selectedClient.address || '';
													}
													homeOpenOrderer = false;
													tick().then(() => {
														homeOrdererTriggerRef?.focus();
													});
												}}
												class="flex items-center gap-2"
											>
												<CheckIcon
													class={cn(
														'me-2 size-4',
														homeContractOrderer !== customer.value && 'text-transparent'
													)}
												/>
												{customer.label}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
				<input type="hidden" name="orderClientId" value={homeContractOrderer} />
				<Input
					name="ordererContactName"
					placeholder="담당자"
					bind:value={homeContractOrdererContact}
				/>
				<Input
					name="ordererContactPosition"
					placeholder="직급/직책"
					bind:value={homeContractOrdererPosition}
				/>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="flex flex-col gap-1">
					<Input
						name="ordererContactPhone"
						placeholder="연락처"
						bind:value={homeContractOrdererPhone}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractOrdererPhone = formatted;
						}}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<Input
						name="ordererContactEmail"
						type="email"
						placeholder="이메일"
						bind:value={homeContractOrdererEmail}
					/>
				</div>
				<Input
					name="ordererAddress"
					class="md:col-span-2"
					placeholder="주소"
					bind:value={homeContractOrdererAddress}
				/>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>계약 상태</Label>
			<RadioGroup.Root
				bind:value={homeContractStatus}
				class="grid grid-cols-1 lg:grid-cols-3 gap-6"
			>
				<div class="flex items-center gap-2">
					<div class="flex items-center space-x-2 whitespace-nowrap">
						<RadioGroup.Item value="active" id="completed-r1" />
						<Label for="completed-r1">계약완료</Label>
					</div>
					<Popover.Root bind:open={homeContractDateOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-start font-normal',
										!homeContractDate && 'text-muted-foreground'
									)}
									{...props}
									disabled={homeContractStatus !== 'active'}
								>
									<CalendarIcon class="me-2 size-4" />
									{homeContractDate
										? dateFormatter.format(homeContractDate.toDate(getLocalTimeZone()))
										: '계약일 선택'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0 z-[250]">
							<Calendar type="single" bind:value={homeContractDate} captionLayout="dropdown" />
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="flex items-center gap-2">
					<div class="flex items-center space-x-2 whitespace-nowrap">
						<RadioGroup.Item value="terminated" id="completed-r2" />
						<Label for="completed-r2">계약해지</Label>
					</div>
					<Popover.Root bind:open={homeContractTerminationDateOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-start font-normal',
										!homeContractTerminationDate && 'text-muted-foreground'
									)}
									{...props}
									disabled={homeContractStatus !== 'terminated'}
								>
									<CalendarIcon class="me-2 size-4" />
									{homeContractTerminationDate
										? dateFormatter.format(homeContractTerminationDate.toDate(getLocalTimeZone()))
										: '계약해지일 선택'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0 z-[250]">
							<Calendar
								type="single"
								bind:value={homeContractTerminationDate}
								captionLayout="dropdown"
							/>
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="flex items-center gap-2">
					<div class="flex items-center space-x-2 whitespace-nowrap">
						<RadioGroup.Item value="pre-sales" id="completed-r3" />
						<Label for="completed-r3">사전영업</Label>
					</div>
					<Popover.Root bind:open={homeContractPreSalesDateOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-start font-normal',
										!homeContractPreSalesDate && 'text-muted-foreground'
									)}
									{...props}
									disabled={homeContractStatus !== 'pre-sales'}
								>
									<CalendarIcon class="me-2 size-4" />
									{homeContractPreSalesDate
										? dateFormatter.format(homeContractPreSalesDate.toDate(getLocalTimeZone()))
										: '사전영업일 선택'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0 z-[250]">
							<Calendar
								type="single"
								bind:value={homeContractPreSalesDate}
								captionLayout="dropdown"
							/>
						</Popover.Content>
					</Popover.Root>
				</div>
			</RadioGroup.Root>
		</div>

		<Separator />

		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="space-y-3">
				<Label>총계약금액</Label>
				<Input type="number" placeholder="총계약금액" bind:value={homeContractAmount} />
			</div>
			<div class="space-y-3">
				<Label>계약금</Label>
				<Input type="number" placeholder="계약금" bind:value={homeContractDownPayment} />
			</div>
			<div class="space-y-3">
				<Label>중도금</Label>
				<Input type="number" placeholder="중도금" bind:value={homeContractInterimPayment} />
			</div>
			<div class="space-y-3">
				<Label>잔금</Label>
				<Input type="number" placeholder="잔금" readonly value={homeContractBalance} />
			</div>
		</div>

		<Separator />

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="space-y-3">
				<Label>세금계산서 발행일</Label>
				<Popover.Root bind:open={homeContractTaxInvoiceDateOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class={cn(
									'w-full justify-start text-start font-normal',
									!homeContractTaxInvoiceDate && 'text-muted-foreground'
								)}
								{...props}
							>
								<CalendarIcon class="me-2 size-4" />
								{homeContractTaxInvoiceDate
									? dateFormatter.format(homeContractTaxInvoiceDate.toDate(getLocalTimeZone()))
									: '세금계산서 발행일 선택'}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0 z-[250]">
						<Calendar
							type="single"
							bind:value={homeContractTaxInvoiceDate}
							captionLayout="dropdown"
						/>
					</Popover.Content>
				</Popover.Root>
			</div>
			<div class="space-y-3">
				<Label>유지비 월 청구금</Label>
				<Input
					type="number"
					placeholder="유지비 월 청구금"
					bind:value={homeContractMaintenanceAmount}
				/>
			</div>
			<div class="space-y-3">
				<Label>청구일 (매월)</Label>
				<Input
					type="number"
					placeholder="청구일 (1-31)"
					bind:value={homeContractBillingDate}
					min="1"
					max="31"
				/>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>계약담당자</Label>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Input placeholder="이름" bind:value={homeContractManagerName} />
				<Input placeholder="직급/직책" bind:value={homeContractManagerPosition} />
				<div class="flex flex-col gap-1">
					<Input
						placeholder="연락처"
						bind:value={homeContractManagerPhone}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractManagerPhone = formatted;
						}}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<Input type="email" placeholder="이메일" bind:value={homeContractManagerEmail} />
				</div>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>구축기간</Label>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Popover.Root bind:open={homeContractConstructionStartDateOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class={cn(
									'w-full justify-start text-start font-normal',
									!homeContractConstructionStartDate && 'text-muted-foreground'
								)}
								{...props}
							>
								<CalendarIcon class="me-2 size-4" />
								{homeContractConstructionStartDate
									? dateFormatter.format(
											homeContractConstructionStartDate.toDate(getLocalTimeZone())
										)
									: '구축시작일 선택'}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0 z-[250]">
						<Calendar
							type="single"
							bind:value={homeContractConstructionStartDate}
							captionLayout="dropdown"
						/>
					</Popover.Content>
				</Popover.Root>
				<Popover.Root bind:open={homeContractConstructionEndDateOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class={cn(
									'w-full justify-start text-start font-normal',
									!homeContractConstructionEndDate && 'text-muted-foreground'
								)}
								{...props}
							>
								<CalendarIcon class="me-2 size-4" />
								{homeContractConstructionEndDate
									? dateFormatter.format(homeContractConstructionEndDate.toDate(getLocalTimeZone()))
									: '구축종료일 선택'}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0 z-[250]">
						<Calendar
							type="single"
							bind:value={homeContractConstructionEndDate}
							captionLayout="dropdown"
						/>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>설치담당자</Label>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Input placeholder="협력사" bind:value={homeContractInstallPartner} />
				<Input placeholder="이름" bind:value={homeContractInstallName} />
				<div class="flex flex-col gap-1">
					<Input
						placeholder="전화번호"
						bind:value={homeContractInstallPhone}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractInstallPhone = formatted;
						}}
					/>
				</div>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>건물정보</Label>
			<Textarea
				placeholder="건물에 대한 정보를 입력하세요."
				class="resize-none"
				bind:value={homeContractBuildingInfo}
			/>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>객실 설치 정보</Label>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Dialog.Root bind:open={homeOpenRoomId}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between overflow-hidden min-w-0"
								{...props}
							>
								{homeContractRooms.length > 0
									? `객실 ${homeContractRooms.length}개`
									: '객실 ID 관리...'}
								<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content
						showCloseButton={false}
						class="sm:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0"
					>
						<Dialog.Header class="px-6 pt-6 pb-2">
							<div class="flex items-center justify-between">
								<Dialog.Title>객실 ID 관리</Dialog.Title>
								<div class="flex items-center gap-2">
									{#if homeContractRooms.some((r) => r.checked)}
										<Button
											variant="destructive"
											size="sm"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												removeSelectedHomeRooms();
											}}
											class="gap-2"
										>
											<TrashIcon class="size-4" />
											선택 삭제
										</Button>
									{/if}
									<Button variant="outline" size="sm" type="button" onclick={addHomeRoomRow}>
										<PlusIcon class="mr-2 h-4 w-4" />
										추가
									</Button>
								</div>
							</div>
						</Dialog.Header>
						<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
							<div class="border rounded-md overflow-hidden">
								{#if homeContractRooms.length === 0}
									<Table.Root>
										<Table.Header class="bg-muted">
											<Table.Row>
												<Table.Head class="w-12"></Table.Head>
												<Table.Head class="w-12">
													<Checkbox checked={false} onCheckedChange={() => {}} />
												</Table.Head>
												<Table.Head>건물명</Table.Head>
												<Table.Head>룸번호</Table.Head>
												<Table.Head>ID</Table.Head>
												<Table.Head>메모</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											<Table.Row>
												<Table.Cell colspan={6} class="text-center text-muted-foreground py-8">
													데이터가 없습니다.
												</Table.Cell>
											</Table.Row>
										</Table.Body>
									</Table.Root>
								{:else}
									<DragDropProvider
										onDragEnd={(e) => (homeContractRooms = move(homeContractRooms, e))}
										modifiers={[
											// @ts-expect-error @dnd-kit/abstract types are botched atm
											RestrictToVerticalAxis
										]}
									>
										<Table.Root>
											<Table.Header class="bg-muted">
												<Table.Row>
													<Table.Head class="w-12"></Table.Head>
													<Table.Head class="w-12">
														<Checkbox
															checked={homeContractRooms.length > 0 &&
																homeContractRooms.every((r) => r.checked)}
															onCheckedChange={(v) => {
																homeContractRooms = homeContractRooms.map((r) => ({
																	...r,
																	checked: !!v
																}));
															}}
														/>
													</Table.Head>
													<Table.Head>건물명</Table.Head>
													<Table.Head>룸번호</Table.Head>
													<Table.Head>ID</Table.Head>
													<Table.Head>메모</Table.Head>
												</Table.Row>
											</Table.Header>
											<Table.Body>
												{#each homeContractRooms as room, index (room.id)}
													{@render DraggableRoomRow({ room, index })}
												{/each}
											</Table.Body>
										</Table.Root>
									</DragDropProvider>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
							<Dialog.Close>
								{#snippet child({ props })}
									<Button variant="outline" {...props}>취소</Button>
								{/snippet}
							</Dialog.Close>
							<Button onclick={() => (homeOpenRoomId = false)}>저장</Button>
						</div>
					</Dialog.Content>
				</Dialog.Root>

				<Dialog.Root bind:open={homeOpenRepeaterId}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between overflow-hidden min-w-0"
								{...props}
							>
								{homeContractRepeaters.length > 0
									? `중계기 ${homeContractRepeaters.length}개`
									: '중계기 ID 관리...'}
								<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content
						showCloseButton={false}
						class="sm:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0"
					>
						<Dialog.Header class="px-6 pt-6 pb-2">
							<div class="flex items-center justify-between">
								<Dialog.Title>중계기 ID 관리</Dialog.Title>
								<div class="flex items-center gap-2">
									{#if homeContractRepeaters.some((r) => r.checked)}
										<Button
											variant="destructive"
											size="sm"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												removeSelectedHomeRepeaters();
											}}
											class="gap-2"
										>
											<TrashIcon class="size-4" />
											선택 삭제
										</Button>
									{/if}
									<Button variant="outline" size="sm" type="button" onclick={addHomeRepeaterRow}>
										<PlusIcon class="mr-2 h-4 w-4" />
										추가
									</Button>
								</div>
							</div>
						</Dialog.Header>
						<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
							<div class="border rounded-md overflow-hidden">
								{#if homeContractRepeaters.length === 0}
									<Table.Root>
										<Table.Header class="bg-muted">
											<Table.Row>
												<Table.Head class="w-12"></Table.Head>
												<Table.Head class="w-12">
													<Checkbox checked={false} onCheckedChange={() => {}} />
												</Table.Head>
												<Table.Head>중계기 ID</Table.Head>
												<Table.Head>룸번호</Table.Head>
												<Table.Head>메모</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											<Table.Row>
												<Table.Cell colspan={5} class="text-center text-muted-foreground py-8">
													데이터가 없습니다.
												</Table.Cell>
											</Table.Row>
										</Table.Body>
									</Table.Root>
								{:else}
									<DragDropProvider
										onDragEnd={(e) => (homeContractRepeaters = move(homeContractRepeaters, e))}
										modifiers={[
											// @ts-expect-error @dnd-kit/abstract types are botched atm
											RestrictToVerticalAxis
										]}
									>
										<Table.Root>
											<Table.Header class="bg-muted">
												<Table.Row>
													<Table.Head class="w-12"></Table.Head>
													<Table.Head class="w-12">
														<Checkbox
															checked={homeContractRepeaters.length > 0 &&
																homeContractRepeaters.every((r) => r.checked)}
															onCheckedChange={(v) => {
																homeContractRepeaters = homeContractRepeaters.map((r) => ({
																	...r,
																	checked: !!v
																}));
															}}
														/>
													</Table.Head>
													<Table.Head>중계기 ID</Table.Head>
													<Table.Head>룸번호</Table.Head>
													<Table.Head>메모</Table.Head>
												</Table.Row>
											</Table.Header>
											<Table.Body>
												{#each homeContractRepeaters as repeater, index (repeater.id)}
													{@render DraggableRepeaterRow({ repeater, index })}
												{/each}
											</Table.Body>
										</Table.Root>
									</DragDropProvider>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
							<Dialog.Close>
								{#snippet child({ props })}
									<Button variant="outline" {...props}>취소</Button>
								{/snippet}
							</Dialog.Close>
							<Button onclick={() => (homeOpenRepeaterId = false)}>저장</Button>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>납품제품종류</Label>
			<Dialog.Root bind:open={homeOpenDeliveryProducts}>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							class="w-full justify-between overflow-hidden min-w-0"
							{...props}
						>
							{homeContractDeliveryProducts.length > 0
								? `제품 ${homeContractDeliveryProducts.length}개`
								: '납품 제품 관리...'}
							<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Dialog.Trigger>
				<Dialog.Content
					showCloseButton={false}
					class="sm:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0"
				>
					<Dialog.Header class="px-6 pt-6 pb-2">
						<div class="flex items-center justify-between">
							<Dialog.Title>납품 제품 관리</Dialog.Title>
							<div class="flex items-center gap-2">
								{#if homeContractDeliveryProducts.some((r) => r.checked)}
									<Button
										variant="destructive"
										size="sm"
										type="button"
										onclick={(e) => {
											e.preventDefault();
											removeSelectedHomeDeliveryProducts();
										}}
										class="gap-2"
									>
										<TrashIcon class="size-4" />
										선택 삭제
									</Button>
								{/if}
								<Button
									variant="outline"
									size="sm"
									type="button"
									onclick={addHomeDeliveryProductRow}
								>
									<PlusIcon class="mr-2 h-4 w-4" />
									추가
								</Button>
							</div>
						</div>
					</Dialog.Header>
					<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
						<div class="border rounded-md overflow-hidden">
							{#if homeContractDeliveryProducts.length === 0}
								<Table.Root>
									<Table.Header class="bg-muted">
										<Table.Row>
											<Table.Head class="w-12"></Table.Head>
											<Table.Head class="w-12">
												<Checkbox checked={false} onCheckedChange={() => {}} />
											</Table.Head>
											<Table.Head>제품</Table.Head>
											<Table.Head>수량</Table.Head>
											<Table.Head class="hidden">펌웨어</Table.Head>
											<Table.Head>메모</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										<Table.Row>
											<Table.Cell colspan={5} class="text-center text-muted-foreground py-8">
												데이터가 없습니다.
											</Table.Cell>
										</Table.Row>
									</Table.Body>
								</Table.Root>
							{:else}
								<DragDropProvider
									onDragEnd={(e) =>
										(homeContractDeliveryProducts = move(homeContractDeliveryProducts, e))}
									modifiers={[
										// @ts-expect-error @dnd-kit/abstract types are botched atm
										RestrictToVerticalAxis
									]}
								>
									<Table.Root>
										<Table.Header class="bg-muted">
											<Table.Row>
												<Table.Head class="w-12"></Table.Head>
												<Table.Head class="w-12">
													<Checkbox
														checked={homeContractDeliveryProducts.length > 0 &&
															homeContractDeliveryProducts.every((r) => r.checked)}
														onCheckedChange={(v) => {
															homeContractDeliveryProducts = homeContractDeliveryProducts.map(
																(r) => ({ ...r, checked: !!v })
															);
														}}
													/>
												</Table.Head>
												<Table.Head>제품</Table.Head>
												<Table.Head>수량</Table.Head>
												<Table.Head class="hidden">펌웨어</Table.Head>
												<Table.Head>메모</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each homeContractDeliveryProducts as product, index (product.id)}
												{@render DraggableDeliveryProductRow({ product, index })}
											{/each}
										</Table.Body>
									</Table.Root>
								</DragDropProvider>
							{/if}
						</div>
					</div>
					<div class="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
						<Dialog.Close>
							{#snippet child({ props })}
								<Button variant="outline" {...props}>취소</Button>
							{/snippet}
						</Dialog.Close>
						<Button onclick={() => (homeOpenDeliveryProducts = false)}>저장</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>

		<Separator />

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<Label>AS 기록</Label>
				<Button variant="outline" size="sm" onclick={addHomeASRecord}>
					<PlusIcon class="mr-2 h-4 w-4" />
					기록 추가
				</Button>
			</div>
			<div class="space-y-4">
				{#each homeContractASRecords as record, i (record.id)}
					<Collapsible.Root bind:open={record.isOpen} class="border rounded-lg p-4 relative">
						<div class="flex items-center justify-between">
							<Collapsible.Trigger class="flex items-center gap-2 flex-1 text-left">
								{#snippet child({ props })}
									<div {...props} class="flex items-center gap-2 cursor-pointer">
										<Button variant="ghost" size="icon" class="h-8 w-8 p-0">
											<ChevronsUpDown class="h-4 w-4" />
											<span class="sr-only">Toggle</span>
										</Button>
										<span class="text-sm font-medium flex items-center gap-2">
											{record.requestDate
												? dateFormatter.format(record.requestDate.toDate(getLocalTimeZone()))
												: '요청일자 미정'}
											<Badge variant={record.isCompleted ? 'default' : 'secondary'}>
												{record.isCompleted ? '완료' : '미완료'}
											</Badge>
										</span>
									</div>
								{/snippet}
							</Collapsible.Trigger>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:text-destructive"
								type="button"
								onclick={async (e) => {
									e.preventDefault();

									// 1. 현재 다이얼로그의 스크롤 위치 저장
									const savedScrollTop = homeContractDialogScrollContainer?.scrollTop ?? 0;

									// 2. 데이터 삭제 실행
									removeHomeASRecord(record.id);

									// 3. Svelte가 DOM을 업데이트할 때까지 대기
									await tick();

									// 4. 스크롤 위치 복원
									if (homeContractDialogScrollContainer) {
										homeContractDialogScrollContainer.scrollTop = savedScrollTop;
									}
								}}
							>
								<XIcon class="h-4 w-4" />
							</Button>
						</div>

						<Collapsible.Content class="space-y-4 pt-4">
							<div class="flex flex-col md:flex-row gap-4">
								<div class="w-full md:w-1/3 space-y-2">
									<Label>비용</Label>
									<Input type="number" bind:value={record.cost} placeholder="0" />
								</div>
								<div class="space-y-2">
									<Label class="invisible">완료</Label>
									<div class="flex items-center space-x-2 h-9">
										<Checkbox
											id={`completed-as-completed-${record.id}`}
											bind:checked={record.isCompleted}
										/>
										<Label
											for={`completed-as-completed-${record.id}`}
											class="cursor-pointer font-normal">완료 여부</Label
										>
									</div>
								</div>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-4">
									<div class="space-y-2">
										<Label>요청일자</Label>
										<Popover.Root bind:open={record.requestDateOpen}>
											<Popover.Trigger>
												{#snippet child({ props })}
													<Button
														variant="outline"
														class={cn(
															'w-full justify-start text-start font-normal',
															!record.requestDate && 'text-muted-foreground'
														)}
														{...props}
													>
														<CalendarIcon class="me-2 size-4" />
														{record.requestDate
															? dateFormatter.format(record.requestDate.toDate(getLocalTimeZone()))
															: '요청일자 선택'}
													</Button>
												{/snippet}
											</Popover.Trigger>
											<Popover.Content class="w-auto p-0 z-[250]">
												<Calendar
													type="single"
													bind:value={record.requestDate}
													captionLayout="dropdown"
												/>
											</Popover.Content>
										</Popover.Root>
									</div>
									<div class="space-y-2">
										<Label>요청내용</Label>
										<Textarea
											bind:value={record.requestContent}
											class="resize-none"
											rows={3}
											placeholder="요청내용을 입력하세요."
										/>
									</div>
								</div>
								<div class="space-y-4">
									<div class="space-y-2">
										<Label>대응일자</Label>
										<Popover.Root bind:open={record.responseDateOpen}>
											<Popover.Trigger>
												{#snippet child({ props })}
													<Button
														variant="outline"
														class={cn(
															'w-full justify-start text-start font-normal',
															!record.responseDate && 'text-muted-foreground'
														)}
														{...props}
													>
														<CalendarIcon class="me-2 size-4" />
														{record.responseDate
															? dateFormatter.format(record.responseDate.toDate(getLocalTimeZone()))
															: '대응일자 선택'}
													</Button>
												{/snippet}
											</Popover.Trigger>
											<Popover.Content class="w-auto p-0 z-[250]">
												<Calendar
													type="single"
													bind:value={record.responseDate}
													captionLayout="dropdown"
												/>
											</Popover.Content>
										</Popover.Root>
									</div>
									<div class="space-y-2">
										<Label>대응내용</Label>
										<Textarea
											bind:value={record.responseContent}
											class="resize-none"
											rows={3}
											placeholder="대응내용을 입력하세요."
										/>
									</div>
								</div>
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			</div>
		</div>

		<Separator />

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<Label>관련문서</Label>
				<div class="flex items-center gap-2">
					{#if homeContractDocuments.some((d) => d.checked)}
						<Button
							variant="destructive"
							size="sm"
							type="button"
							onclick={(e) => {
								e.preventDefault();
								removeSelectedHomeDocuments();
							}}
						>
							삭제
						</Button>
					{/if}
					<Button variant="outline" size="sm" onclick={openAddHomeDocumentDialog}>
						<PlusIcon class="mr-2 h-4 w-4" />
						문서 추가
					</Button>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg border">
				<DragDropProvider
					onDragEnd={(e) => (homeContractDocuments = move(homeContractDocuments, e))}
					modifiers={[
						// @ts-expect-error @dnd-kit/abstract types are botched atm
						RestrictToVerticalAxis
					]}
				>
					<Table.Root>
						<Table.Header class="bg-muted">
							<Table.Row>
								<Table.Head class="w-12"></Table.Head>
								<Table.Head class="w-12">
									<Checkbox
										checked={homeContractDocuments.length > 0 &&
											homeContractDocuments.every((d) => d.checked)}
										onCheckedChange={(v) => {
											homeContractDocuments = homeContractDocuments.map((d) => ({
												...d,
												checked: !!v
											}));
										}}
									/>
								</Table.Head>
								<Table.Head class="min-w-[200px]">내용</Table.Head>
								<Table.Head class="min-w-[250px]">파일</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class="**:data-[slot=table-cell]:first:w-8">
							{#if homeContractDocuments.length === 0}
								<Table.Row>
									<Table.Cell colspan={4} class="h-24 text-center">결과가 없습니다.</Table.Cell>
								</Table.Row>
							{:else}
								{#each homeContractDocuments as doc, index (doc.id)}
									{@render DraggableHomeDocumentRow({ doc, index })}
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</DragDropProvider>
			</div>
		</div>

		<!-- Document Dialog -->
		<Dialog.Root bind:open={homeOpenDocumentDialog}>
			<Dialog.Content class="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
				<Dialog.Header class="px-6 pt-6 pb-2">
					<Dialog.Title>{homeEditingDocument ? '문서 수정' : '문서 추가'}</Dialog.Title>
				</Dialog.Header>
				<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
					<div class="space-y-4">
						<Field>
							<FieldLabel>내용</FieldLabel>
							<FieldContent>
								<Input placeholder="문서 내용을 입력하세요" bind:value={homeNewDocumentContent} />
							</FieldContent>
						</Field>
						<Field>
							<FieldLabel>파일</FieldLabel>
							<FieldContent>
								<FileUploadField
									bind:newFile={homeNewDocumentFile}
									bind:existingFileListId={homeExistingDocumentFileListId}
									bind:existingFileName={homeExistingDocumentFileName}
									inputId="completed-as-document-file"
									scrollContainer={homeContractDialogScrollContainer}
									uploadHint="PDF, DOCX 등"
								/>
							</FieldContent>
						</Field>
					</div>
				</div>
				<div class="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
					<Dialog.Close>
						{#snippet child({ props })}
							<Button variant="outline" {...props}>취소</Button>
						{/snippet}
					</Dialog.Close>
					<Button onclick={saveHomeDocument}>저장</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	</div>
{/snippet}
