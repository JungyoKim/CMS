<script lang="ts">
	import type { Schema } from './schemas.js';
	import type { Attachment } from 'svelte/attachments';
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Field, FieldLabel, FieldContent } from '$lib/components/ui/field/index.js';
	import { toast } from 'svelte-sonner';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { DragDropProvider } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import { cn } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { type DateValue, getLocalTimeZone } from '@internationalized/date';
	import {
		dateFormatter,
		dateValueToString,
		stringToDateValue,
		formatPhoneNumber,
		validateEmail,
		validatePhone,
		formatCurrency,
		parseCurrency,
		downloadFile,
		removeFileWithScrollPreserve
	} from './data-table/utils.js';

	// Icons
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import PlusIcon from '@tabler/icons-svelte/icons/plus';
	import XIcon from '@tabler/icons-svelte/icons/x';
	import FileIcon from '@tabler/icons-svelte/icons/file';
	import DownloadIcon from '@tabler/icons-svelte/icons/download';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Check from '@lucide/svelte/icons/check';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import LoaderIcon from '@tabler/icons-svelte/icons/loader';

	let {
		open = $bindable(false),
		contract = $bindable<Schema | null>(null),
		clientList = [],
		productList = [],
		firmwareList = [],
		createAction = '?/createContract',
		updateAction = '?/updateContract'
	}: {
		open?: boolean;
		contract?: Schema | null;
		clientList?: Array<any>;
		productList?: Array<{ id: number; name: string }>;
		firmwareList?: Array<{ id: number; name: string }>;
		createAction?: string;
		updateAction?: string;
	} = $props();

	// --- Form & Dialog State ---
	let validationError = $state<string | null>(null);
	let dialogScrollContainer: HTMLDivElement | null = null;
	let submittingContract = $state(false);
	let hasLoadedEditingRow = $state(false);

	// --- Contract Form Fields ---
	let homeContractName = $state('');
	let homeContractStatus = $state('active');
	let homeContractDate = $state<DateValue | undefined>(undefined);
	let homeContractTerminationDate = $state<DateValue | undefined>(undefined);
	let homeContractPreSalesDate = $state<DateValue | undefined>(undefined);
	let homeContractAmount = $state('');
	let homeContractDownPayment = $state('');
	let homeContractInterimPayments = $state<
		{ id: string; amount: string; date: DateValue | undefined; memo: string; checked: boolean }[]
	>([]);
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
	let homeContractTaxInvoiceAmount = $state('');
	let homeContractTaxInvoiceIssueDate = $state<DateValue | undefined>(undefined);
	let homeContractTaxInvoiceDepositDate = $state<DateValue | undefined>(undefined);
	let taxInvoiceIssueDateOpen = $state(false);
	let taxInvoiceDepositDateOpen = $state(false);
	let homeContractBuildingInfo = $state('');
	let homeContractCustomerMemo = $state('');

	// --- Customer & Orderer State ---
	let openCustomer = $state(false);
	let openOrderer = $state(false);
	let customerTriggerRef = $state<HTMLButtonElement>(null!);
	let ordererTriggerRef = $state<HTMLButtonElement>(null!);
	let homeContractCustomer = $state<string>('');
	let homeContractOrderer = $state<string>('');
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
	let previousCustomerId = $state<string>('');
	let previousOrdererId = $state<string>('');
	let lastClientListUpdate = $state<number>(0);

	// --- Date Picker Open States ---
	let contractDateOpen = $state(false);
	let contractTerminationDateOpen = $state(false);
	let contractPreSalesDateOpen = $state(false);
	let taxInvoiceDateOpen = $state(false);
	let constructionStartDateOpen = $state(false);
	let constructionEndDateOpen = $state(false);

	// --- Attachments ---
	let homeContractAttachmentFile = $state<File | null>(null);
	let existingContractAttachmentFileName = $state<string | null>(null);
	let existingContractAttachmentFileListId = $state<string | null>(null);

	// --- Nested Data Management (Rooms, Repeaters, etc.) ---
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
		file: File | null;
		fileName?: string | null;
		fileListId?: string | null;
	};
	type DocumentEntry = {
		id: string;
		content: string;
		file: File | null;
		fileName?: string;
		fileListId?: string;
		checked: boolean;
	};

	type TaxInvoiceRecord = {
		id: string;
		issueDate: DateValue | undefined;
		amount: string;
		memo: string;
		issueDateOpen: boolean;
		checked: boolean;
	};

	let contractRooms = $state<RoomEntry[]>([]);
	let contractRepeaters = $state<RepeaterEntry[]>([]);
	let contractDeliveryProducts = $state<DeliveryProductEntry[]>([]);
	let contractASRecords = $state<ASEntry[]>([]);
	let contractDocuments = $state<DocumentEntry[]>([]);
	let homeContractTaxInvoices = $state<TaxInvoiceRecord[]>([]);

	// --- Nested Dialogs ---
	let openRoomId = $state(false);
	let openRepeaterId = $state(false);
	let openDeliveryProducts = $state(false);
	let openDocumentDialog = $state(false);

	// Document Edit State
	let editingDocument = $state<DocumentEntry | null>(null);
	let newDocumentContent = $state('');
	let newDocumentFile = $state<File | null>(null);
	let existingDocumentFileName = $state<string | null>(null);
	let existingDocumentFileListId = $state<string | null>(null);

	// --- Client Edit Dialog State ---
	let clientEditDialogOpen = $state(false);
	let editingClientId = $state<number | null>(null);
	let editingClientRow = $state<Schema | null>(null);
	let submittingClient = $state(false);

	// --- Client Form State ---
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

	// Client Form Validation Errors
	let mainContactPhoneError = $state<string | null>(null);
	let mainContactEmailError = $state<string | null>(null);
	let subContactPhoneError = $state<string | null>(null);
	let subContactEmailError = $state<string | null>(null);
	let faxError = $state<string | null>(null);

	// Validation Errors
	let customerContactPhoneError = $state<string | null>(null);
	let customerContactEmailError = $state<string | null>(null);
	let ordererContactPhoneError = $state<string | null>(null);
	let ordererContactEmailError = $state<string | null>(null);
	let managerPhoneError = $state<string | null>(null);
	let managerEmailError = $state<string | null>(null);
	let installerPhoneError = $state<string | null>(null);
	let loadingClientId = $state<number | null>(null);

	// --- Product Edit Dialog State ---
	let productEditDialogOpen = $state(false);
	let editingProductId = $state<number | null>(null);
	let editingProductRow = $state<Schema | null>(null);
	let loadingProductId = $state<number | null>(null);
	let submittingProduct = $state(false);

	// --- Product Form State ---
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

	// --- Product Inventory State ---
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

	// --- Firmware Edit Dialog State ---
	let firmwareEditDialogOpen = $state(false);
	let editingFirmwareId = $state<number | null>(null);
	let editingFirmwareRow = $state<Schema | null>(null);
	let loadingFirmwareId = $state<number | null>(null);
	let submittingFirmware = $state(false);

	// --- Firmware Form State ---
	let newFirmwareName = $state('');
	let newFirmwareVersion = $state('');
	let newFirmwareMemo = $state('');
	let newFirmwareDocFile = $state<File | null>(null);
	let newFirmwareBinFile = $state<File | null>(null);
	let existingFirmwareFileName = $state<string | null>(null);
	let existingFirmwareFileListId = $state<string | null>(null);
	let existingDocFileName = $state<string | null>(null);
	let existingDocFileListId = $state<string | null>(null);

	// --- Derived Values ---

	// Calculate Balance Automatically
	$effect(() => {
		const total = parseInt(parseCurrency(homeContractAmount)) || 0;
		const downPayment = parseInt(parseCurrency(homeContractDownPayment)) || 0;

		const interimTotal = homeContractInterimPayments.reduce(
			(acc, curr) => acc + (parseInt(parseCurrency(curr.amount)) || 0),
			0
		);

		const balance = total - (downPayment + interimTotal);
		homeContractBalance = balance >= 0 ? formatCurrency(String(balance)) : '';
	});

	// Convert clientList to Options
	const customers = $derived(
		clientList.map((client) => ({
			value: String(client.id),
			label:
				client.name.trim() ||
				`${client.name1 || ''} ${client.name2 || ''} ${client.name3 || ''} ${client.name4 || ''} ${client.name5 || ''}`.trim() ||
				`고객사 ${client.id}`,
			client: client
		}))
	);

	const productOptions = $derived(
		productList.map((product) => ({
			value: String(product.id),
			label: product.name || `제품 ${product.id}`
		}))
	);

	const firmwareOptions = $derived(
		firmwareList.map((firmware) => ({
			value: String(firmware.id),
			label: firmware.name || `펌웨어 ${firmware.id}`
		}))
	);

	// --- Effects: Auto-fill Customer Info ---
	$effect(() => {
		if (clientList.length > 0) {
			lastClientListUpdate = Date.now();
		}
	});

	$effect(() => {
		if (homeContractCustomer && clientList.length > 0) {
			if (homeContractCustomer !== previousCustomerId) {
				const selectedClient = clientList.find((c) => String(c.id) === homeContractCustomer);
				if (selectedClient) {
					homeContractCustomerContact = selectedClient.mainContactName || '';
					homeContractCustomerPosition = selectedClient.mainContactPosition || '';
					homeContractCustomerPhone = selectedClient.mainContactPhone || '';
					homeContractCustomerEmail = selectedClient.mainContactEmail || '';
					homeContractCustomerAddress = selectedClient.address || '';
					previousCustomerId = homeContractCustomer;
				}
			}
		} else if (!homeContractCustomer) {
			previousCustomerId = '';
		}
	});

	$effect(() => {
		if (homeContractOrderer && clientList.length > 0) {
			if (homeContractOrderer !== previousOrdererId) {
				const selectedClient = clientList.find((c) => String(c.id) === homeContractOrderer);
				if (selectedClient) {
					homeContractOrdererContact = selectedClient.mainContactName || '';
					homeContractOrdererPosition = selectedClient.mainContactPosition || '';
					homeContractOrdererPhone = selectedClient.mainContactPhone || '';
					homeContractOrdererEmail = selectedClient.mainContactEmail || '';
					homeContractOrdererAddress = selectedClient.address || '';
					previousOrdererId = homeContractOrderer;
				}
			}
		} else if (!homeContractOrderer) {
			previousOrdererId = '';
		}
	});

	// Load editing row when it changes
	$effect(() => {
		if (open && !hasLoadedEditingRow) {
			hasLoadedEditingRow = true;
			if (contract) {
				loadEditingRowIntoForm();
			} else {
				resetForm();
			}
		}
	});

	// Reset the "loaded" flag when dialog is closed so next open triggers a reload/reset
	$effect(() => {
		if (!open) {
			hasLoadedEditingRow = false;
		}
	});

	// --- Helper Functions ---

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

	function removeSelectedHomeTaxInvoices() {
		homeContractTaxInvoices = homeContractTaxInvoices.filter((inv) => !inv.checked);
	}

	function addHomeTaxInvoice() {
		homeContractTaxInvoices = [
			...homeContractTaxInvoices,
			{
				id: crypto.randomUUID(),
				issueDate: undefined,
				amount: '',
				memo: '',
				issueDateOpen: false,
				checked: false
			}
		];
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

	function resetFirmwareEditDialog() {
		newFirmwareName = '';
		newFirmwareVersion = '';
		newFirmwareMemo = '';
		newFirmwareDocFile = null;
		newFirmwareBinFile = null;
		existingFirmwareFileName = null;
		existingFirmwareFileListId = null;
		existingDocFileName = null;
		existingDocFileListId = null;
		editingFirmwareRow = null;
		editingFirmwareId = null;
		validationError = null;
	}

	function resetForm() {
		homeContractName = '';
		homeContractStatus = 'active';
		homeContractDate = undefined;
		homeContractTerminationDate = undefined;
		homeContractPreSalesDate = undefined;
		homeContractTaxInvoiceDate = undefined;
		homeContractAmount = '';
		homeContractDownPayment = '';
		homeContractInterimPayments = [];
		homeContractBalance = '';
		homeContractTaxInvoices = [];
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
		homeContractTaxInvoiceAmount = '';
		homeContractTaxInvoiceIssueDate = undefined;
		homeContractTaxInvoiceDepositDate = undefined;
		homeContractBuildingInfo = '';
		homeContractCustomerMemo = '';
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
		existingContractAttachmentFileName = null;
		existingContractAttachmentFileListId = null;
		contractRooms = [];
		contractRepeaters = [];
		contractDeliveryProducts = [];
		contractASRecords = [];
		contractDocuments = [];
		previousCustomerId = '';
		previousOrdererId = '';
		validationError = null;
	}

	function loadEditingRowIntoForm() {
		if (!contract) return;

		// @ts-expect-error
		homeContractName = contract.name || '';
		// @ts-expect-error
		homeContractStatus = contract.status || 'active';
		// @ts-expect-error
		homeContractDate = stringToDateValue(contract.contractDate);
		// @ts-expect-error
		homeContractTerminationDate = stringToDateValue(contract.cancelDate);
		// @ts-expect-error
		homeContractPreSalesDate = stringToDateValue(contract.salesStartDate);
		// @ts-expect-error
		homeContractAmount = contract.deposit ? formatCurrency(String(contract.deposit)) : '';
		// @ts-expect-error
		homeContractDownPayment = contract.prepayment
			? formatCurrency(String(contract.prepayment))
			: '';

		if (contract.interimPaymentsData) {
			try {
				const loadedInterim = JSON.parse(contract.interimPaymentsData);
				homeContractInterimPayments = loadedInterim.map((i: any) => ({
					id: i.id || crypto.randomUUID(),
					amount: i.amount ? formatCurrency(String(i.amount)) : '',
					date: i.date ? stringToDateValue(i.date) : undefined,
					memo: i.memo || '',
					checked: false
				}));
			} catch (e) {
				console.error('Failed to parse interimPayments data', e);
				homeContractInterimPayments = [];
			}
		} else {
			homeContractInterimPayments = [];
		}

		try {
			// @ts-expect-error
			const loadedTaxInvoices = contract.taxInvoicesData
				? JSON.parse(contract.taxInvoicesData)
				: [];
			homeContractTaxInvoices = loadedTaxInvoices.map((inv: any) => ({
				id: crypto.randomUUID(),
				issueDate: inv.issueDate ? stringToDateValue(inv.issueDate) : undefined,
				amount: inv.amount ? formatCurrency(String(inv.amount)) : '',
				memo: inv.memo || '',
				issueDateOpen: false,
				checked: false
			}));
		} catch (e) {
			console.error('Failed to parse tax invoices data', e);
			homeContractTaxInvoices = [];
		}
		homeContractMaintenanceAmount = contract.maintenanceMonthlyAmount
			? formatCurrency(String(contract.maintenanceMonthlyAmount))
			: '';
		// @ts-expect-error
		homeContractTaxInvoiceDate = stringToDateValue(contract.taxInvoiceDate);
		// @ts-expect-error
		homeContractBillingDate = contract.billingDayOfMonth ? String(contract.billingDayOfMonth) : '';
		// @ts-expect-error
		homeContractManagerName = contract.managerName || '';
		// @ts-expect-error
		homeContractManagerPhone = contract.managerPhone || '';
		// @ts-expect-error
		homeContractManagerEmail = contract.managerEmail || '';
		// @ts-expect-error
		homeContractConstructionStartDate = stringToDateValue(contract.buildStartDate);
		// @ts-expect-error
		homeContractConstructionEndDate = stringToDateValue(contract.buildEndDate);
		// @ts-expect-error
		homeContractInstallPartner = contract.installerCompany || '';
		// @ts-expect-error
		homeContractInstallName = contract.installerName || '';
		// @ts-expect-error
		homeContractInstallPhone = contract.installerPhone || '';
		// @ts-expect-error
		homeContractTaxInvoiceAmount = contract.taxInvoiceAmount
			? formatCurrency(String(contract.taxInvoiceAmount))
			: '';
		// @ts-expect-error
		homeContractTaxInvoiceIssueDate = stringToDateValue(contract.taxInvoiceIssueDate);
		// @ts-expect-error
		homeContractTaxInvoiceDepositDate = stringToDateValue(contract.taxInvoiceDepositDate);
		// @ts-expect-error
		homeContractBuildingInfo = contract.buildingInfo || '';
		// @ts-expect-error
		homeContractCustomerMemo = contract.customerMemo || '';

		// Customers
		// @ts-expect-error
		homeContractCustomer = contract.clientId ? String(contract.clientId) : '';
		// @ts-expect-error
		homeContractOrderer = contract.orderClientId ? String(contract.orderClientId) : '';
		// @ts-expect-error
		homeContractCustomerContact = contract.customerContactName || '';
		// @ts-expect-error
		homeContractCustomerPosition = contract.customerContactPosition || '';
		// @ts-expect-error
		homeContractCustomerPhone = contract.customerContactPhone || '';
		// @ts-expect-error
		homeContractCustomerEmail = contract.customerContactEmail || '';
		// @ts-expect-error
		homeContractCustomerAddress = contract.customerAddress || '';
		// @ts-expect-error
		homeContractOrdererContact = contract.ordererContactName || '';
		// @ts-expect-error
		homeContractOrdererPosition = contract.ordererContactPosition || '';
		// @ts-expect-error
		homeContractOrdererPhone = contract.ordererContactPhone || '';
		// @ts-expect-error
		homeContractOrdererEmail = contract.ordererContactEmail || '';
		// @ts-expect-error
		homeContractOrdererAddress = contract.ordererAddress || '';

		// Attachment
		// @ts-expect-error
		existingContractAttachmentFileName = contract.attachmentFileName || null;
		// @ts-expect-error
		existingContractAttachmentFileListId = contract.attachmentFileListId || null;

		// Nested Data
		// @ts-expect-error
		const roomsData = contract.roomsData || [];
		contractRooms = roomsData.map((room: any, index: number) => ({
			id: `room-${index}`,
			checked: false,
			building: room.building || '',
			room: room.room || '',
			roomId: room.roomId || '',
			memo: room.memo || ''
		}));

		// @ts-expect-error
		const repeatersData = contract.repeatersData || [];
		contractRepeaters = repeatersData.map((repeater: any, index: number) => ({
			id: `repeater-${index}`,
			checked: false,
			repeaterId: repeater.repeaterId || '',
			room: repeater.room || '',
			memo: repeater.memo || ''
		}));

		// @ts-expect-error
		const installProductsData = contract.installProductsData || [];
		contractDeliveryProducts = installProductsData.map((product: any, index: number) => ({
			id: `product-${index}`,
			checked: false,
			productId: product.productId || '',
			quantity: product.quantity || 0,
			firmwareId: product.firmwareId || '',
			memo: product.memo || '',
			openProduct: false,
			openFirmware: false
		}));

		// @ts-expect-error
		const asRecordsData = contract.asRecordsData || [];
		contractASRecords = asRecordsData.map((record: any, index: number) => ({
			id: `as-${index}`,
			requestDate: stringToDateValue(record.requestDate),
			requestContent: record.requestContent || '',
			responseDate: stringToDateValue(record.responseDate),
			responseContent: record.responseContent || '',
			cost: record.cost ? formatCurrency(String(record.cost)) : '',
			isCompleted: record.isCompleted || false,
			requestDateOpen: false,
			responseDateOpen: false,
			isOpen: false,
			file: null,
			fileName: record.photoFileName || null,
			fileListId: record.fileListId || null
		}));

		// @ts-expect-error
		const documentsData = contract.documentsData || [];
		contractDocuments = documentsData.map((doc: any, index: number) => ({
			checked: false,
			id: doc.fileListId || `doc-${index}`,
			content: doc.content || '',
			file: null,
			fileName: doc.fileName || '',
			fileListId: doc.fileListId || ''
		}));
	}

	function handleFileChange(
		event: Event,
		type:
			| 'attachment'
			| 'document'
			| 'client-biz-license'
			| 'firmware-doc'
			| 'firmware-bin'
			| 'firmware-doc'
			| 'firmware-bin'
			| 'product-photo'
			| 'as-file',
		docId?: string
	) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			if (type === 'attachment') {
				homeContractAttachmentFile = input.files[0];
			} else if (type === 'document' && docId) {
				contractDocuments = contractDocuments.map((doc) =>
					doc.id === docId ? { ...doc, file: input.files![0] } : doc
				);
			} else if (type === 'client-biz-license') {
				newCustomerBizLicenseFile = input.files[0];
			} else if (type === 'firmware-doc') {
				newFirmwareDocFile = input.files[0];
			} else if (type === 'firmware-bin') {
				newFirmwareBinFile = input.files[0];
			} else if (type === 'product-photo') {
				newProductFile = input.files[0];
			} else if (type === 'as-file' && docId) {
				contractASRecords = contractASRecords.map((record) =>
					record.id === docId ? { ...record, file: input.files![0] } : record
				);
			}
		}
	}

	function removeProductFile() {
		newProductFile = null;
		existingProductFileName = null;
		existingProductFileListId = null;
	}

	function removeFirmwareFile(type: 'firmware-doc' | 'firmware-bin') {
		if (type === 'firmware-doc') {
			newFirmwareDocFile = null;
			existingDocFileName = null;
			existingDocFileListId = null;
		} else if (type === 'firmware-bin') {
			newFirmwareBinFile = null;
			existingFirmwareFileName = null;
			existingFirmwareFileListId = null;
		}
	}

	// downloadFile is now imported from utils

	async function removeFile(type: 'attachment' | 'client-biz-license') {
		await removeFileWithScrollPreserve(dialogScrollContainer, () => {
			if (type === 'attachment') {
				homeContractAttachmentFile = null;
			} else if (type === 'client-biz-license') {
				newCustomerBizLicenseFile = null;
				existingCustomerRegistrationFileName = null;
				existingCustomerRegistrationFileListId = null;
			}
		});
	}

	// --- Nested Data Helpers ---
	function addRoomRow() {
		contractRooms = [
			...contractRooms,
			{ id: Math.random().toString(), checked: false, building: '', room: '', roomId: '', memo: '' }
		];
	}
	function removeSelectedRooms() {
		contractRooms = contractRooms.filter((r) => !r.checked);
	}
	function addRepeaterRow() {
		contractRepeaters = [
			...contractRepeaters,
			{ id: Math.random().toString(), checked: false, repeaterId: '', room: '', memo: '' }
		];
	}
	function removeSelectedRepeaters() {
		contractRepeaters = contractRepeaters.filter((r) => !r.checked);
	}
	function addDeliveryProductRow() {
		contractDeliveryProducts = [
			...contractDeliveryProducts,
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
	function removeSelectedDeliveryProducts() {
		contractDeliveryProducts = contractDeliveryProducts.filter((r) => !r.checked);
	}
	function addASRecord() {
		contractASRecords = [
			...contractASRecords,
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
				isOpen: true,
				file: null,
				fileName: null,
				fileListId: null
			}
		];
	}
	function removeASRecord(id: string) {
		contractASRecords = contractASRecords.filter((r) => r.id !== id);
	}

	// --- Document Helpers ---
	function openAddDocumentDialog() {
		editingDocument = null;
		newDocumentContent = '';
		newDocumentFile = null;
		existingDocumentFileName = null;
		existingDocumentFileListId = null;
		openDocumentDialog = true;
	}

	function openEditDocumentDialog(doc: DocumentEntry) {
		editingDocument = doc;
		newDocumentContent = doc.content || '';
		newDocumentFile = doc.file || null;
		existingDocumentFileName = doc.fileName || null;
		existingDocumentFileListId = doc.fileListId || null;
		openDocumentDialog = true;
	}

	async function saveDocument() {
		if (!newDocumentContent.trim() && !newDocumentFile && !existingDocumentFileListId) {
			toast('내용 또는 파일을 입력해주세요.');
			return;
		}

		const isAdding = !editingDocument;
		const newDoc = {
			content: newDocumentContent,
			file: newDocumentFile,
			fileName: newDocumentFile ? newDocumentFile.name : existingDocumentFileName,
			fileListId: newDocumentFile ? undefined : existingDocumentFileListId
		};

		if (editingDocument) {
			contractDocuments = contractDocuments.map((doc) =>
				doc.id === editingDocument!.id ? { ...doc, ...newDoc } : doc
			);
		} else {
			contractDocuments = [
				...contractDocuments,
				{ id: Math.random().toString(), checked: false, ...newDoc }
			];
		}

		openDocumentDialog = false;
		editingDocument = null;
		const isAddingFinal = isAdding;
		if (isAddingFinal && dialogScrollContainer) {
			await tick();
			dialogScrollContainer.scrollTop = dialogScrollContainer.scrollHeight;
		}
	}

	async function removeSelectedDocuments() {
		const currentScrollTop = dialogScrollContainer?.scrollTop ?? 0;
		contractDocuments = contractDocuments.filter((r) => !r.checked);
		await tick();
		if (dialogScrollContainer) dialogScrollContainer.scrollTop = currentScrollTop;
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			// 다이얼로그 닫힘 애니메이션이 완료된 후 초기화 (약 500ms 지연)
			setTimeout(() => {
				if (open) return;
				resetForm();
				contract = null;
				hasLoadedEditingRow = false;
			}, 500);
		}
	}}
>
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0">
		<div class="px-6 pt-6">
			<Dialog.Header>
				<Dialog.Title>계약 수정</Dialog.Title>
			</Dialog.Header>
		</div>
		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action={contract ? updateAction : createAction}
			use:enhance={({ formData, cancel }) => {
				if (homeContractAttachmentFile || contractDocuments.some((doc) => doc.file))
					submittingContract = true;

				if (!homeContractName?.trim()) {
					validationError = '계약명을 입력하세요.';
					setTimeout(() => (validationError = null), 5000);
					cancel();
					submittingContract = false;
					return;
				}

				// Validations
				if (homeContractCustomerPhone && !validatePhone(homeContractCustomerPhone)) {
					customerContactPhoneError = '올바른 전화번호 형식이 아닙니다.';
					submittingContract = false;
					cancel();
					return;
				}
				if (homeContractCustomerEmail && !validateEmail(homeContractCustomerEmail)) {
					customerContactEmailError = '올바른 이메일 형식이 아닙니다.';
					submittingContract = false;
					cancel();
					return;
				}
				if (homeContractOrdererPhone && !validatePhone(homeContractOrdererPhone)) {
					ordererContactPhoneError = '올바른 전화번호 형식이 아닙니다.';
					submittingContract = false;
					cancel();
					return;
				}
				if (homeContractOrdererEmail && !validateEmail(homeContractOrdererEmail)) {
					ordererContactEmailError = '올바른 이메일 형식이 아닙니다.';
					submittingContract = false;
					cancel();
					return;
				}
				if (homeContractManagerPhone && !validatePhone(homeContractManagerPhone)) {
					managerPhoneError = '올바른 전화번호 형식이 아닙니다.';
					submittingContract = false;
					cancel();
					return;
				}
				if (homeContractManagerEmail && !validateEmail(homeContractManagerEmail)) {
					managerEmailError = '올바른 이메일 형식이 아닙니다.';
					submittingContract = false;
					cancel();
					return;
				}
				if (homeContractInstallPhone && !validatePhone(homeContractInstallPhone)) {
					installerPhoneError = '올바른 전화번호 형식이 아닙니다.';
					submittingContract = false;
					cancel();
					return;
				}

				validationError = null;
				if (contract) formData.set('id', String(contract.id));

				// Essential fields
				formData.set('name', homeContractName);
				formData.set('status', homeContractStatus);
				formData.set(
					'clientId',
					homeContractCustomer || (contract ? String(contract.clientId) : '')
				);
				formData.set(
					'orderClientId',
					homeContractOrderer || (contract ? String(contract.orderClientId) : '')
				);

				// Dates & Amounts
				formData.set('contractDate', dateValueToString(homeContractDate) || '');
				formData.set('cancelDate', dateValueToString(homeContractTerminationDate) || '');
				formData.set('salesStartDate', dateValueToString(homeContractPreSalesDate) || '');
				formData.set('deposit', parseCurrency(homeContractAmount) || '0');
				formData.set('prepayment', parseCurrency(homeContractDownPayment) || '0');
				formData.set('balance', parseCurrency(homeContractBalance) || '0');

				formData.set(
					'interimPaymentsData',
					JSON.stringify(
						homeContractInterimPayments.map((p) => ({
							id: p.id,
							amount: parseCurrency(p.amount) || '0',
							date: p.date ? dateValueToString(p.date) : undefined,
							memo: p.memo
						}))
					)
				);

				// Customer/Orderer Contact Info
				formData.set('customerContactName', homeContractCustomerContact || '');
				formData.set('customerContactPosition', homeContractCustomerPosition || '');
				formData.set('customerContactPhone', homeContractCustomerPhone || '');
				formData.set('customerContactEmail', homeContractCustomerEmail || '');
				formData.set('customerAddress', homeContractCustomerAddress || '');

				formData.set('ordererContactName', homeContractOrdererContact || '');
				formData.set('ordererContactPosition', homeContractOrdererPosition || '');
				formData.set('ordererContactPhone', homeContractOrdererPhone || '');
				formData.set('ordererContactEmail', homeContractOrdererEmail || '');
				formData.set('ordererAddress', homeContractOrdererAddress || '');

				// Additional fields
				formData.set(
					'taxInvoicesData',
					JSON.stringify(
						homeContractTaxInvoices.map((inv) => ({
							id: inv.id,
							issueDate: inv.issueDate ? dateValueToString(inv.issueDate) : undefined,
							amount: parseCurrency(inv.amount),
							memo: inv.memo
						}))
					)
				);
				formData.set('taxInvoiceDate', dateValueToString(homeContractTaxInvoiceDate) || '');
				formData.set('billingDayOfMonth', homeContractBillingDate || '');
				formData.set('managerName', homeContractManagerName || '');
				formData.set('managerPosition', homeContractManagerPosition || '');
				formData.set('managerPhone', homeContractManagerPhone || '');
				formData.set('managerEmail', homeContractManagerEmail || '');
				formData.set('buildStartDate', dateValueToString(homeContractConstructionStartDate) || '');
				formData.set('buildEndDate', dateValueToString(homeContractConstructionEndDate) || '');
				formData.set('installerCompany', homeContractInstallPartner || '');
				formData.set('installerName', homeContractInstallName || '');
				formData.set('installerPhone', homeContractInstallPhone || '');
				formData.set('buildingInfo', homeContractBuildingInfo || '');
				formData.set('customerMemo', homeContractCustomerMemo || '');
				formData.set('taxInvoiceAmount', parseCurrency(homeContractTaxInvoiceAmount) || '0');
				formData.set(
					'taxInvoiceIssueDate',
					dateValueToString(homeContractTaxInvoiceIssueDate) || ''
				);
				formData.set(
					'taxInvoiceDepositDate',
					dateValueToString(homeContractTaxInvoiceDepositDate) || ''
				);
				formData.set(
					'maintenanceMonthlyAmount',
					parseCurrency(homeContractMaintenanceAmount) || '0'
				);

				// JSON Data
				formData.set('roomsData', JSON.stringify(contractRooms));
				formData.set('repeatersData', JSON.stringify(contractRepeaters));
				formData.set('installProductsData', JSON.stringify(contractDeliveryProducts));

				// AS Records
				const asRecordsForSubmit = contractASRecords.map((r) => ({
					requestDate: dateValueToString(r.requestDate) || '',
					requestContent: r.requestContent,
					responseDate: dateValueToString(r.responseDate) || '',
					responseContent: r.responseContent,
					cost: parseCurrency(r.cost),
					isCompleted: r.isCompleted,
					fileListId: r.fileListId
				}));
				formData.set('asRecordsData', JSON.stringify(asRecordsForSubmit));
				contractASRecords.forEach((record, index) => {
					if (record.file) formData.set(`asFile_${index}`, record.file);
				});

				// Documents
				const documentsForSubmit = contractDocuments.map((doc) => ({
					content: doc.content,
					file: doc.file
				}));
				formData.set('documentsData', JSON.stringify(documentsForSubmit));
				contractDocuments.forEach((doc, index) => {
					if (doc.file) formData.set(`documentFile_${index}`, doc.file);
				});

				// @ts-expect-error
				const originalFileListId = contract?.attachmentFileListId;
				if (
					originalFileListId &&
					!existingContractAttachmentFileListId &&
					!homeContractAttachmentFile
				) {
					formData.set('removeAttachmentFile', 'true');
				}
				if (homeContractAttachmentFile) {
					formData.set('attachmentFile', homeContractAttachmentFile);
				}

				return async ({ result, update }) => {
					submittingContract = false;
					if (result.type === 'success') {
						validationError = null;

						// 다이얼로그 닫기 (이것이 onOpenChange를 트리거함)
						open = false;

						// 데이터 갱신 (reset: false로 폼 자동 리셋 방지)
						await update({ reset: false });
						await invalidate('contracts:update');
						await invalidate('clients:update');
						toast.success('계약이 수정되었습니다.');

						// resetForm()과 contract = null은 onOpenChange에서 setTimeout으로 처리됨
					} else if (result.type === 'failure') {
						toast.error(result.data?.message || '작업 실패');
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				{@render ContractForm()}
			</div>
			<div class="px-6 pb-6">
				<Dialog.Footer class="flex-row justify-end gap-2">
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							open = false;
						}}>취소</Button
					>
					<Button type="submit" disabled={submittingContract || !homeContractName.trim()}>
						{#if submittingContract}<Spinner class="size-4" />{/if}
						계약 수정
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#snippet ContractForm()}
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
					<Popover.Root bind:open={openCustomer}>
						<Popover.Trigger bind:ref={customerTriggerRef} class="w-full">
							{#snippet child({ props })}
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={openCustomer}
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
							class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0"
						>
							{#key openCustomer}
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
														const selectedClient =
															customer.client ||
															clientList.find((c) => String(c.id) === customer.value);
														if (selectedClient) {
															homeContractCustomerContact = selectedClient.mainContactName || '';
															homeContractCustomerPosition =
																selectedClient.mainContactPosition || '';
															homeContractCustomerPhone = selectedClient.mainContactPhone || '';
															homeContractCustomerEmail = selectedClient.mainContactEmail || '';
															homeContractCustomerAddress = selectedClient.address || '';
															previousCustomerId = customer.value;
														}
														openCustomer = false;
														tick().then(() => customerTriggerRef?.focus());
													}}
													class="flex items-center justify-between group"
												>
													<div class="flex items-center gap-2">
														<CheckIcon
															class={cn(
																'me-2 size-4',
																homeContractCustomer !== customer.value && 'text-transparent'
															)}
														/>
														{customer.label}
													</div>
													<Button
														variant="ghost"
														size="icon"
														class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
														disabled={loadingClientId === Number(customer.value)}
														onclick={async (e) => {
															e.preventDefault();
															e.stopPropagation();
															loadingClientId = Number(customer.value);
															try {
																const selectedClient = clientList.find(
																	(c) => String(c.id) === customer.value
																);
																if (selectedClient) {
																	const nameParts = [
																		selectedClient.name1,
																		selectedClient.name2,
																		selectedClient.name3,
																		selectedClient.name4,
																		selectedClient.name5
																	].filter(Boolean);
																	const name = nameParts.join(' ') || `고객사 ${selectedClient.id}`;

																	editingClientRow = {
																		id: selectedClient.id,
																		name1: selectedClient.name1 || '',
																		name2: selectedClient.name2 || '',
																		name3: selectedClient.name3 || '',
																		name4: selectedClient.name4 || '',
																		name5: selectedClient.name5 || '',
																		businessNumber: '',
																		zipCode: '',
																		address: selectedClient.address || '',
																		fax: '',
																		mainContactName: selectedClient.mainContactName || '',
																		mainContactPosition: selectedClient.mainContactPosition || '',
																		mainContactPhone: selectedClient.mainContactPhone || '',
																		mainContactEmail: selectedClient.mainContactEmail || '',
																		subContactName: selectedClient.subContactName || '',
																		subContactPosition: selectedClient.subContactPosition || '',
																		subContactPhone: selectedClient.subContactPhone || '',
																		subContactEmail: selectedClient.subContactEmail || '',
																		name: name
																	} as unknown as Schema;

																	newCustomerName = selectedClient.name1 || '';
																	newCustomerSource = selectedClient.name2 || '';
																	newCustomerItem3 = selectedClient.name3 || '';
																	newCustomerItem4 = selectedClient.name4 || '';
																	newCustomerItem5 = selectedClient.name5 || '';
																	newCustomerBusinessNumber = '';
																	newCustomerZipCode = '';
																	newCustomerAddress = selectedClient.address || '';
																	newCustomerFax = '';
																	newCustomerMainContactName = selectedClient.mainContactName || '';
																	newCustomerMainContactPosition =
																		selectedClient.mainContactPosition || '';
																	newCustomerMainContactPhone =
																		selectedClient.mainContactPhone || '';
																	newCustomerMainContactEmail =
																		selectedClient.mainContactEmail || '';
																	newCustomerSubContactName = selectedClient.subContactName || '';
																	newCustomerSubContactPosition =
																		selectedClient.subContactPosition || '';
																	newCustomerSubContactPhone = selectedClient.subContactPhone || '';
																	newCustomerSubContactEmail = selectedClient.subContactEmail || '';
																	existingCustomerRegistrationFileName = null;
																	existingCustomerRegistrationFileListId = null;
																	newCustomerBizLicenseFile = null;

																	editingClientId = selectedClient.id;

																	clientEditDialogOpen = true;
																	openCustomer = false;
																}
															} catch (error) {
																console.error('Failed to load client:', error);
																toast.error('고객사 데이터를 불러오는데 실패했습니다.');
															} finally {
																loadingClientId = null;
															}
														}}
													>
														{#if loadingClientId === Number(customer.value)}
															<LoaderIcon class="h-3 w-3 animate-spin" />
														{:else}
															<DotsVerticalIcon class="h-4 w-4" />
														{/if}
														<span class="sr-only">Edit client</span>
													</Button>
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							{/key}
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
						aria-invalid={customerContactPhoneError ? 'true' : 'false'}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractCustomerPhone = formatted;
							if (customerContactPhoneError) {
								customerContactPhoneError = null;
							}
						}}
						onblur={() => {
							customerContactPhoneError = validatePhone(homeContractCustomerPhone)
								? null
								: '올바른 전화번호 형식이 아닙니다.';
						}}
					/>
					{#if customerContactPhoneError}
						<p class="text-xs text-destructive">{customerContactPhoneError}</p>
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<Input
						name="customerContactEmail"
						type="email"
						placeholder="이메일"
						bind:value={homeContractCustomerEmail}
						aria-invalid={customerContactEmailError ? 'true' : 'false'}
						onblur={() => {
							customerContactEmailError = validateEmail(homeContractCustomerEmail)
								? null
								: '올바른 이메일 형식이 아닙니다.';
						}}
					/>
					{#if customerContactEmailError}
						<p class="text-xs text-destructive">{customerContactEmailError}</p>
					{/if}
				</div>
				<Input
					name="customerAddress"
					class="md:col-span-2"
					placeholder="주소"
					bind:value={homeContractCustomerAddress}
				/>
			</div>
			<div class="space-y-2">
				<Label>메모</Label>
				<Textarea
					placeholder="고객 관련 메모를 입력하세요."
					class="resize-none"
					bind:value={homeContractCustomerMemo}
				/>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>발주처 정보</Label>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
				<div class="col-span-2 md:col-span-2 w-full min-w-0">
					<Popover.Root bind:open={openOrderer}>
						<Popover.Trigger bind:ref={ordererTriggerRef} class="w-full">
							{#snippet child({ props })}
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={openOrderer}
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
							class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0"
						>
							{#key openOrderer}
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
														const selectedClient =
															customer.client ||
															clientList.find((c) => String(c.id) === customer.value);
														if (selectedClient) {
															homeContractOrdererContact = selectedClient.mainContactName || '';
															homeContractOrdererPosition =
																selectedClient.mainContactPosition || '';
															homeContractOrdererPhone = selectedClient.mainContactPhone || '';
															homeContractOrdererEmail = selectedClient.mainContactEmail || '';
															homeContractOrdererAddress = selectedClient.address || '';
															previousOrdererId = customer.value;
														}
														openOrderer = false;
														tick().then(() => {
															ordererTriggerRef?.focus();
														});
													}}
													class="flex items-center justify-between group"
												>
													<div class="flex items-center gap-2">
														<CheckIcon
															class={cn(
																'me-2 size-4',
																homeContractOrderer !== customer.value && 'text-transparent'
															)}
														/>
														{customer.label}
													</div>
													<Button
														variant="ghost"
														size="icon"
														class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
														disabled={loadingClientId === Number(customer.value)}
														onclick={async (e) => {
															e.preventDefault();
															e.stopPropagation();
															loadingClientId = Number(customer.value);
															try {
																const selectedClient = clientList.find(
																	(c) => String(c.id) === customer.value
																);
																if (selectedClient) {
																	const nameParts = [
																		selectedClient.name1,
																		selectedClient.name2,
																		selectedClient.name3,
																		selectedClient.name4,
																		selectedClient.name5
																	].filter(Boolean);
																	const name = nameParts.join(' ') || `고객사 ${selectedClient.id}`;

																	editingClientRow = {
																		id: selectedClient.id,
																		name1: selectedClient.name1 || '',
																		name2: selectedClient.name2 || '',
																		name3: selectedClient.name3 || '',
																		name4: selectedClient.name4 || '',
																		name5: selectedClient.name5 || '',
																		businessNumber: '',
																		zipCode: '',
																		address: selectedClient.address || '',
																		fax: '',
																		mainContactName: selectedClient.mainContactName || '',
																		mainContactPosition: selectedClient.mainContactPosition || '',
																		mainContactPhone: selectedClient.mainContactPhone || '',
																		mainContactEmail: selectedClient.mainContactEmail || '',
																		subContactName: selectedClient.subContactName || '',
																		subContactPosition: selectedClient.subContactPosition || '',
																		subContactPhone: selectedClient.subContactPhone || '',
																		subContactEmail: selectedClient.subContactEmail || '',
																		name: name
																	} as unknown as Schema;

																	newCustomerName = selectedClient.name1 || '';
																	newCustomerSource = selectedClient.name2 || '';
																	newCustomerItem3 = selectedClient.name3 || '';
																	newCustomerItem4 = selectedClient.name4 || '';
																	newCustomerItem5 = selectedClient.name5 || '';
																	newCustomerBusinessNumber = '';
																	newCustomerZipCode = '';
																	newCustomerAddress = selectedClient.address || '';
																	newCustomerFax = '';
																	newCustomerMainContactName = selectedClient.mainContactName || '';
																	newCustomerMainContactPosition =
																		selectedClient.mainContactPosition || '';
																	newCustomerMainContactPhone =
																		selectedClient.mainContactPhone || '';
																	newCustomerMainContactEmail =
																		selectedClient.mainContactEmail || '';
																	newCustomerSubContactName = selectedClient.subContactName || '';
																	newCustomerSubContactPosition =
																		selectedClient.subContactPosition || '';
																	newCustomerSubContactPhone = selectedClient.subContactPhone || '';
																	newCustomerSubContactEmail = selectedClient.subContactEmail || '';
																	existingCustomerRegistrationFileName = null;
																	existingCustomerRegistrationFileListId = null;
																	newCustomerBizLicenseFile = null;

																	editingClientId = selectedClient.id;

																	clientEditDialogOpen = true;
																	openOrderer = false;
																}
															} catch (error) {
																console.error('Failed to load client:', error);
																toast.error('발주처 데이터를 불러오는데 실패했습니다.');
															} finally {
																loadingClientId = null;
															}
														}}
													>
														{#if loadingClientId === Number(customer.value)}
															<LoaderIcon class="h-3 w-3 animate-spin" />
														{:else}
															<DotsVerticalIcon class="h-4 w-4" />
														{/if}
														<span class="sr-only">Edit client</span>
													</Button>
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							{/key}
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
						aria-invalid={ordererContactPhoneError ? 'true' : 'false'}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractOrdererPhone = formatted;
							if (ordererContactPhoneError) {
								ordererContactPhoneError = null;
							}
						}}
						onblur={() => {
							ordererContactPhoneError = validatePhone(homeContractOrdererPhone)
								? null
								: '올바른 전화번호 형식이 아닙니다.';
						}}
					/>
					{#if ordererContactPhoneError}
						<p class="text-xs text-destructive">{ordererContactPhoneError}</p>
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<Input
						name="ordererContactEmail"
						type="email"
						placeholder="이메일"
						bind:value={homeContractOrdererEmail}
						aria-invalid={ordererContactEmailError ? 'true' : 'false'}
						onblur={() => {
							ordererContactEmailError = validateEmail(homeContractOrdererEmail)
								? null
								: '올바른 이메일 형식이 아닙니다.';
						}}
					/>
					{#if ordererContactEmailError}
						<p class="text-xs text-destructive">{ordererContactEmailError}</p>
					{/if}
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
				class="grid grid-cols-1 md:grid-cols-3 gap-6"
			>
				{#each [{ val: 'active', label: '계약완료', dateVal: homeContractDate, open: contractDateOpen, setDate: (d: any) => (homeContractDate = d), setOpen: (o: boolean) => (contractDateOpen = o), placeholder: '계약일 선택' }, { val: 'terminated', label: '계약해지', dateVal: homeContractTerminationDate, open: contractTerminationDateOpen, setDate: (d: any) => (homeContractTerminationDate = d), setOpen: (o: boolean) => (contractTerminationDateOpen = o), placeholder: '해지일 선택' }, { val: 'pre-sales', label: '사전영업', dateVal: homeContractPreSalesDate, open: contractPreSalesDateOpen, setDate: (d: any) => (homeContractPreSalesDate = d), setOpen: (o: boolean) => (contractPreSalesDateOpen = o), placeholder: '영업일 선택' }] as item}
					<div class="flex items-center gap-2">
						<div class="flex items-center space-x-2 whitespace-nowrap">
							<RadioGroup.Item value={item.val} id={item.val} />
							<Label for={item.val}>{item.label}</Label>
						</div>
						<Popover.Root open={item.open} onOpenChange={item.setOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class={cn(
											'w-full justify-start text-start font-normal',
											!item.dateVal && 'text-muted-foreground'
										)}
										{...props}
										disabled={homeContractStatus !== item.val}
									>
										<CalendarIcon class="me-2 size-4" />
										{item.dateVal
											? dateFormatter.format(item.dateVal.toDate(getLocalTimeZone()))
											: item.placeholder}
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0 z-[250]">
								<Calendar
									type="single"
									value={item.dateVal}
									onValueChange={item.setDate}
									captionLayout="dropdown"
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
				{/each}
			</RadioGroup.Root>
		</div>

		<Separator />

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="space-y-3">
				<Label>총계약금액</Label>
				<Input
					type="text"
					placeholder="총계약금액"
					bind:value={homeContractAmount}
					oninput={(e) => {
						homeContractAmount = formatCurrency(e.currentTarget.value);
					}}
				/>
			</div>
			<div class="space-y-3">
				<Label>계약금</Label>
				<Input
					type="text"
					placeholder="계약금"
					bind:value={homeContractDownPayment}
					oninput={(e) => {
						homeContractDownPayment = formatCurrency(e.currentTarget.value);
					}}
				/>
			</div>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<Label>중도금 내역</Label>
				<div class="flex items-center gap-2">
					{#if homeContractInterimPayments.some((inv) => inv.checked)}
						<Button
							variant="destructive"
							size="sm"
							type="button"
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								homeContractInterimPayments = homeContractInterimPayments.filter((i) => !i.checked);
							}}
						>
							<TrashIcon class="mr-2 h-4 w-4" />
							선택 삭제
						</Button>
					{/if}
					<Button
						variant="outline"
						size="sm"
						type="button"
						onclick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							homeContractInterimPayments = [
								...homeContractInterimPayments,
								{
									id: crypto.randomUUID(),
									amount: '',
									date: undefined,
									memo: '',
									checked: false
								}
							];
						}}
					>
						<PlusIcon class="mr-2 h-4 w-4" />
						추가
					</Button>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg border">
				<DragDropProvider
					onDragEnd={(e) => (homeContractInterimPayments = move(homeContractInterimPayments, e))}
					modifiers={[
						// @ts-expect-error
						RestrictToVerticalAxis
					]}
				>
					<Table.Root>
						<Table.Header class="bg-muted">
							<Table.Row>
								<Table.Head class="w-12"></Table.Head>
								<Table.Head class="w-12">
									<Checkbox
										checked={homeContractInterimPayments.length > 0 &&
											homeContractInterimPayments.every((inv) => inv.checked)}
										onCheckedChange={(v) => {
											homeContractInterimPayments = homeContractInterimPayments.map((inv) => ({
												...inv,
												checked: !!v
											}));
										}}
									/>
								</Table.Head>
								<Table.Head class="min-w-[150px]">중도금</Table.Head>
								<Table.Head class="min-w-[180px]">납부일</Table.Head>
								<Table.Head class="min-w-[200px]">메모</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class="**:data-[slot=table-cell]:first:w-8">
							{#if homeContractInterimPayments.length === 0}
								<Table.Row>
									<Table.Cell colspan={5} class="h-24 text-center">결과가 없습니다.</Table.Cell>
								</Table.Row>
							{:else}
								{#each homeContractInterimPayments as payment, index (payment.id)}
									{@render DraggableInterimPaymentRow({ payment, index })}
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</DragDropProvider>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4">
			<div class="space-y-3">
				<Label>잔금</Label>
				<Input type="text" placeholder="잔금" readonly value={homeContractBalance} />
			</div>
		</div>

		<Separator />

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<Label>세금계산서 내역</Label>
				<div class="flex items-center gap-2">
					{#if homeContractTaxInvoices.some((inv) => inv.checked)}
						<Button
							variant="destructive"
							size="sm"
							type="button"
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								removeSelectedHomeTaxInvoices();
							}}
						>
							<TrashIcon class="mr-2 h-4 w-4" />
							선택 삭제
						</Button>
					{/if}
					<Button
						variant="outline"
						size="sm"
						type="button"
						onclick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							addHomeTaxInvoice();
						}}
					>
						<PlusIcon class="mr-2 h-4 w-4" />
						추가
					</Button>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg border">
				<DragDropProvider
					onDragEnd={(e) => (homeContractTaxInvoices = move(homeContractTaxInvoices, e))}
					modifiers={[
						// @ts-expect-error
						RestrictToVerticalAxis
					]}
				>
					<Table.Root>
						<Table.Header class="bg-muted">
							<Table.Row>
								<Table.Head class="w-12"></Table.Head>
								<Table.Head class="w-12">
									<Checkbox
										checked={homeContractTaxInvoices.length > 0 &&
											homeContractTaxInvoices.every((inv) => inv.checked)}
										onCheckedChange={(v) => {
											homeContractTaxInvoices = homeContractTaxInvoices.map((inv) => ({
												...inv,
												checked: !!v
											}));
										}}
									/>
								</Table.Head>
								<Table.Head class="min-w-[180px]">발행일</Table.Head>
								<Table.Head class="min-w-[150px]">금액</Table.Head>
								<Table.Head class="min-w-[200px]">메모</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class="**:data-[slot=table-cell]:first:w-8">
							{#if homeContractTaxInvoices.length === 0}
								<Table.Row>
									<Table.Cell colspan={5} class="h-24 text-center">결과가 없습니다.</Table.Cell>
								</Table.Row>
							{:else}
								{#each homeContractTaxInvoices as invoice, index (invoice.id)}
									{@render DraggableTaxInvoiceRow({ invoice, index })}
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</DragDropProvider>
			</div>
		</div>

		<Separator />

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="space-y-3">
				<Label>유지보수 세금계산서 발행일</Label>
				<Popover.Root bind:open={taxInvoiceDateOpen}>
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
									: '유지보수 세금계산서 발행일 선택'}
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
					type="text"
					placeholder="유지비 월 청구금"
					bind:value={homeContractMaintenanceAmount}
					oninput={(e) => {
						homeContractMaintenanceAmount = formatCurrency(e.currentTarget.value);
					}}
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
						aria-invalid={managerPhoneError ? 'true' : 'false'}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractManagerPhone = formatted;
							if (managerPhoneError) {
								managerPhoneError = null;
							}
						}}
						onblur={() => {
							managerPhoneError = validatePhone(homeContractManagerPhone)
								? null
								: '올바른 전화번호 형식이 아닙니다.';
						}}
					/>
					{#if managerPhoneError}
						<p class="text-xs text-destructive">{managerPhoneError}</p>
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<Input
						type="email"
						placeholder="이메일"
						bind:value={homeContractManagerEmail}
						aria-invalid={managerEmailError ? 'true' : 'false'}
						onblur={() => {
							managerEmailError = validateEmail(homeContractManagerEmail)
								? null
								: '올바른 이메일 형식이 아닙니다.';
						}}
					/>
					{#if managerEmailError}
						<p class="text-xs text-destructive">{managerEmailError}</p>
					{/if}
				</div>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>구축기간</Label>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Popover.Root bind:open={constructionStartDateOpen}>
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
				<Popover.Root bind:open={constructionEndDateOpen}>
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
						aria-invalid={installerPhoneError ? 'true' : 'false'}
						oninput={(e) => {
							const formatted = formatPhoneNumber(e.currentTarget.value);
							homeContractInstallPhone = formatted;
							if (installerPhoneError) {
								installerPhoneError = null;
							}
						}}
						onblur={() => {
							installerPhoneError = validatePhone(homeContractInstallPhone)
								? null
								: '올바른 전화번호 형식이 아닙니다.';
						}}
					/>
					{#if installerPhoneError}
						<p class="text-xs text-destructive">{installerPhoneError}</p>
					{/if}
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
				<div class="space-y-2">
					<Label>세금계산서 금액</Label>
					<Input
						type="text"
						placeholder="세금계산서 금액"
						bind:value={homeContractTaxInvoiceAmount}
						oninput={(e) => {
							homeContractTaxInvoiceAmount = formatCurrency(e.currentTarget.value);
						}}
					/>
				</div>
				<div class="space-y-2">
					<Label>세금계산서 발행일</Label>
					<Popover.Root bind:open={taxInvoiceIssueDateOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-start font-normal',
										!homeContractTaxInvoiceIssueDate && 'text-muted-foreground'
									)}
									{...props}
								>
									<CalendarIcon class="me-2 size-4" />
									{homeContractTaxInvoiceIssueDate
										? dateFormatter.format(
												homeContractTaxInvoiceIssueDate.toDate(getLocalTimeZone())
											)
										: '발행일 선택'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0 z-[250]">
							<Calendar
								type="single"
								bind:value={homeContractTaxInvoiceIssueDate}
								captionLayout="dropdown"
							/>
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="space-y-2">
					<Label>입금일</Label>
					<Popover.Root bind:open={taxInvoiceDepositDateOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-start font-normal',
										!homeContractTaxInvoiceDepositDate && 'text-muted-foreground'
									)}
									{...props}
								>
									<CalendarIcon class="me-2 size-4" />
									{homeContractTaxInvoiceDepositDate
										? dateFormatter.format(
												homeContractTaxInvoiceDepositDate.toDate(getLocalTimeZone())
											)
										: '입금일 선택'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0 z-[250]">
							<Calendar
								type="single"
								bind:value={homeContractTaxInvoiceDepositDate}
								captionLayout="dropdown"
							/>
						</Popover.Content>
					</Popover.Root>
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
				<Dialog.Root bind:open={openRoomId}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between overflow-hidden min-w-0"
								{...props}
							>
								{contractRooms.length > 0 ? `객실 ${contractRooms.length}개` : '객실 ID 관리...'}
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
									{#if contractRooms.some((r) => r.checked)}
										<Button
											variant="destructive"
											size="sm"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												removeSelectedRooms();
											}}
											class="gap-2"
										>
											<TrashIcon class="size-4" />
											선택 삭제
										</Button>
									{/if}
									<Button variant="outline" size="sm" type="button" onclick={addRoomRow}>
										<PlusIcon class="mr-2 h-4 w-4" />
										추가
									</Button>
								</div>
							</div>
						</Dialog.Header>
						<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
							<div class="border rounded-md overflow-hidden">
								{#if contractRooms.length === 0}
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
										onDragEnd={(e) => (contractRooms = move(contractRooms, e))}
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
															checked={contractRooms.length > 0 &&
																contractRooms.every((r) => r.checked)}
															onCheckedChange={(v) => {
																contractRooms = contractRooms.map((r) => ({ ...r, checked: !!v }));
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
												{#each contractRooms as room, index (room.id)}
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
							<Button onclick={() => (openRoomId = false)}>저장</Button>
						</div>
					</Dialog.Content>
				</Dialog.Root>

				<Dialog.Root bind:open={openRepeaterId}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between overflow-hidden min-w-0"
								{...props}
							>
								{contractRepeaters.length > 0
									? `중계기 ${contractRepeaters.length}개`
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
									{#if contractRepeaters.some((r) => r.checked)}
										<Button
											variant="destructive"
											size="sm"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												removeSelectedRepeaters();
											}}
											class="gap-2"
										>
											<TrashIcon class="size-4" />
											선택 삭제
										</Button>
									{/if}
									<Button variant="outline" size="sm" type="button" onclick={addRepeaterRow}>
										<PlusIcon class="mr-2 h-4 w-4" />
										추가
									</Button>
								</div>
							</div>
						</Dialog.Header>
						<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
							<div class="border rounded-md overflow-hidden">
								{#if contractRepeaters.length === 0}
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
										onDragEnd={(e) => (contractRepeaters = move(contractRepeaters, e))}
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
															checked={contractRepeaters.length > 0 &&
																contractRepeaters.every((r) => r.checked)}
															onCheckedChange={(v) => {
																contractRepeaters = contractRepeaters.map((r) => ({
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
												{#each contractRepeaters as repeater, index (repeater.id)}
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
							<Button onclick={() => (openRepeaterId = false)}>저장</Button>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>

		<Separator />

		<div class="space-y-3">
			<Label>납품제품종류</Label>
			<Dialog.Root bind:open={openDeliveryProducts}>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							class="w-full justify-between overflow-hidden min-w-0"
							{...props}
						>
							{contractDeliveryProducts.length > 0
								? `제품 ${contractDeliveryProducts.length}개`
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
								{#if contractDeliveryProducts.some((r) => r.checked)}
									<Button
										variant="destructive"
										size="sm"
										type="button"
										onclick={(e) => {
											e.preventDefault();
											removeSelectedDeliveryProducts();
										}}
										class="gap-2"
									>
										<TrashIcon class="size-4" />
										선택 삭제
									</Button>
								{/if}
								<Button variant="outline" size="sm" type="button" onclick={addDeliveryProductRow}>
									<PlusIcon class="mr-2 h-4 w-4" />
									추가
								</Button>
							</div>
						</div>
					</Dialog.Header>
					<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
						<div class="border rounded-md overflow-hidden">
							{#if contractDeliveryProducts.length === 0}
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
									onDragEnd={(e) => (contractDeliveryProducts = move(contractDeliveryProducts, e))}
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
														checked={contractDeliveryProducts.length > 0 &&
															contractDeliveryProducts.every((r) => r.checked)}
														onCheckedChange={(v) => {
															contractDeliveryProducts = contractDeliveryProducts.map((r) => ({
																...r,
																checked: !!v
															}));
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
											{#each contractDeliveryProducts as product, index (product.id)}
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
						<Button onclick={() => (openDeliveryProducts = false)}>저장</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>

		<Separator />

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<Label>AS 기록</Label>
				<Button variant="outline" size="sm" onclick={addASRecord}>
					<PlusIcon class="mr-2 h-4 w-4" />
					기록 추가
				</Button>
			</div>
			<div class="space-y-4">
				{#each contractASRecords as record, i (record.id)}
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
									const savedScrollTop = dialogScrollContainer?.scrollTop ?? 0;
									removeASRecord(record.id);
									await tick();
									if (dialogScrollContainer) {
										dialogScrollContainer.scrollTop = savedScrollTop;
									}
								}}
							>
								<XIcon class="h-4 w-4" />
							</Button>
						</div>

						<Collapsible.Content class="space-y-4 pt-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-2 min-w-0">
									<Label>비용</Label>
									<Input
										type="text"
										bind:value={record.cost}
										oninput={(e) => {
											record.cost = formatCurrency(e.currentTarget.value);
										}}
										placeholder="0"
										class="w-full"
									/>
								</div>
								<div class="space-y-2 min-w-0">
									<Label class="invisible">완료</Label>
									<div class="flex items-center space-x-2 h-9 w-full">
										<Checkbox id={`completed-${record.id}`} bind:checked={record.isCompleted} />
										<Label for={`completed-${record.id}`} class="cursor-pointer font-normal"
											>완료 여부</Label
										>
									</div>
								</div>
							</div>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-4 min-w-0">
									<div class="space-y-2">
										<Label>요청일자</Label>
										<Popover.Root bind:open={record.requestDateOpen}>
											<Popover.Trigger>
												{#snippet child({ props })}
													<Button
														variant="outline"
														class={cn(
															'w-full justify-start text-start font-normal min-w-0',
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
								<div class="space-y-4 min-w-0">
									<div class="space-y-2">
										<Label>대응일자</Label>
										<Popover.Root bind:open={record.responseDateOpen}>
											<Popover.Trigger>
												{#snippet child({ props })}
													<Button
														variant="outline"
														class={cn(
															'w-full justify-start text-start font-normal min-w-0',
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

							<div class="mt-4">
								<Label class="text-sm font-medium mb-2 block">첨부파일</Label>
								{#if record.file}
									<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
										<div class="flex items-center gap-2 truncate">
											<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
											<span class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide"
												>{record.file.name}</span
											>
											<span class="text-xs text-muted-foreground">(새 파일)</span>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-destructive hover:text-destructive"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												record.file = null;
											}}
										>
											<XIcon class="h-4 w-4" />
											<span class="sr-only">Remove</span>
										</Button>
									</div>
								{:else if record.fileName}
									<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
										<div class="flex items-center gap-2 truncate">
											<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
											<button
												type="button"
												class="text-sm truncate text-primary hover:underline text-left pointer-events-auto"
												onclick={(e) => {
													e.preventDefault();
													e.stopImmediatePropagation();
													if (record.fileListId) {
														downloadFile({
															name: record.fileName!,
															// @ts-expect-error
															fileListId: record.fileListId
														} as any);
													}
												}}
											>
												{record.fileName}
											</button>
										</div>
										<div class="flex items-center gap-1">
											{#if record.fileListId}
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8"
													onclick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														if (record.fileListId) {
															window.open(`/api/files/${record.fileListId}`, '_blank');
														}
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
												onclick={(e) => {
													e.preventDefault();
													record.fileName = null;
													record.fileListId = null;
												}}
											>
												<XIcon class="h-4 w-4" />
												<span class="sr-only">Remove</span>
											</Button>
										</div>
									</div>
								{:else}
									<div class="flex items-center justify-center w-full">
										<label
											for={`as-file-${record.id}`}
											class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25"
										>
											<div class="flex flex-col items-center justify-center pt-5 pb-6">
												<FileIcon class="w-8 h-8 mb-2 text-muted-foreground" />
												<p class="text-sm text-muted-foreground">
													<span class="font-semibold">파일 업로드</span>
												</p>
												<p class="text-xs text-muted-foreground">이미지, PDF 등</p>
											</div>
											<input
												id={`as-file-${record.id}`}
												type="file"
												class="hidden"
												onchange={(e) => handleFileChange(e, 'as-file', record.id)}
											/>
										</label>
									</div>
								{/if}
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
					{#if contractDocuments.some((d) => d.checked)}
						<Button
							variant="destructive"
							size="sm"
							type="button"
							onclick={(e) => {
								e.preventDefault();
								removeSelectedDocuments();
							}}
							class="gap-2"
						>
							<TrashIcon class="size-4" />
							선택 삭제
						</Button>
					{/if}
					<Button variant="outline" size="sm" onclick={openAddDocumentDialog}>
						<PlusIcon class="mr-2 h-4 w-4" />
						문서 추가
					</Button>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg border">
				<DragDropProvider
					onDragEnd={(e) => (contractDocuments = move(contractDocuments, e))}
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
										checked={contractDocuments.length > 0 &&
											contractDocuments.every((d) => d.checked)}
										onCheckedChange={(v) => {
											contractDocuments = contractDocuments.map((d) => ({ ...d, checked: !!v }));
										}}
									/>
								</Table.Head>
								<Table.Head class="min-w-[200px]">내용</Table.Head>
								<Table.Head class="min-w-[250px]">파일</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class="**:data-[slot=table-cell]:first:w-8">
							{#if contractDocuments.length === 0}
								<Table.Row>
									<Table.Cell colspan={4} class="h-24 text-center">결과가 없습니다.</Table.Cell>
								</Table.Row>
							{:else}
								{#each contractDocuments as doc, index (doc.id)}
									{@render DraggableDocumentRow({ doc, index })}
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</DragDropProvider>
			</div>
		</div>

		<!-- Document Dialog -->
		<Dialog.Root bind:open={openDocumentDialog}>
			<Dialog.Content class="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
				<Dialog.Header class="px-6 pt-6 pb-2">
					<Dialog.Title>{editingDocument ? '문서 수정' : '문서 추가'}</Dialog.Title>
				</Dialog.Header>
				<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
					<div class="space-y-4">
						<Field>
							<FieldLabel>내용</FieldLabel>
							<FieldContent>
								<Input placeholder="문서 내용을 입력하세요" bind:value={newDocumentContent} />
							</FieldContent>
						</Field>
						<Field>
							<FieldLabel>파일</FieldLabel>
							<FieldContent>
								{#if newDocumentFile}
									<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
										<div class="flex items-center gap-2 truncate">
											<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
											<button
												type="button"
												class="text-sm truncate text-primary hover:underline text-left"
												onclick={() => downloadFile(newDocumentFile)}
											>
												{newDocumentFile.name}
											</button>
										</div>
										<div class="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={() => downloadFile(newDocumentFile)}
											>
												<DownloadIcon class="h-4 w-4" />
												<span class="sr-only">Download</span>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-destructive hover:text-destructive"
												onclick={async () => {
													newDocumentFile = null;
													await tick();
													if (dialogScrollContainer) {
														dialogScrollContainer.scrollTop = dialogScrollContainer.scrollHeight;
													}
												}}
											>
												<XIcon class="h-4 w-4" />
												<span class="sr-only">Remove</span>
											</Button>
										</div>
									</div>
								{:else if existingDocumentFileListId && existingDocumentFileName}
									<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
										<div class="flex items-center gap-2 min-w-0">
											<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
											<a
												href="/api/files/{existingDocumentFileListId}"
												class="text-sm text-primary hover:underline overflow-x-auto whitespace-nowrap scrollbar-hide"
												download
											>
												{existingDocumentFileName}
											</a>
										</div>
										<div class="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={() =>
													window.open(`/api/files/${existingDocumentFileListId}`, '_blank')}
											>
												<DownloadIcon class="h-4 w-4" />
												<span class="sr-only">Download</span>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-destructive hover:text-destructive"
												onclick={async () => {
													existingDocumentFileName = null;
													existingDocumentFileListId = null;
													await tick();
													if (dialogScrollContainer) {
														dialogScrollContainer.scrollTop = dialogScrollContainer.scrollHeight;
													}
												}}
											>
												<XIcon class="h-4 w-4" />
												<span class="sr-only">Remove</span>
											</Button>
										</div>
									</div>
								{:else}
									<label
										for="document-file"
										class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25"
									>
										<FileIcon class="w-8 h-8 text-muted-foreground mb-2" />
										<span class="text-sm text-muted-foreground font-medium">파일 업로드</span>
										<span class="text-xs text-muted-foreground mt-1">PDF, DOCX 등</span>
										<input
											id="document-file"
											type="file"
											class="hidden"
											onchange={(e) => {
												const input = e.target as HTMLInputElement;
												if (input.files && input.files.length > 0) {
													newDocumentFile = input.files[0];
												}
											}}
										/>
									</label>
								{/if}
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
					<Button onclick={saveDocument}>저장</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	</div>
{/snippet}

{#snippet DragHandle({ attach }: { attach: Attachment })}
	<Button
		{@attach attach}
		variant="ghost"
		size="icon"
		class="text-muted-foreground size-7 hover:bg-transparent"
		><GripVerticalIcon class="size-3" /><span class="sr-only">Drag</span></Button
	>
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
					{#key product.openProduct}
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
														'mr-2 h-4 w-4',
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
					{/key}
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
					{#key product.openFirmware}
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
											class="flex items-center justify-between group"
										>
											<div class="flex items-center gap-2">
												<Check
													class={cn(
														'mr-2 h-4 w-4',
														product.firmwareId === option.value ? 'opacity-100' : 'opacity-0'
													)}
												/>
												{option.label}
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
												disabled={loadingFirmwareId === Number(option.value)}
												onclick={async (e) => {
													e.preventDefault();
													e.stopPropagation();
													loadingFirmwareId = Number(option.value);
													try {
														const response = await fetch(`/api/firmware/${option.value}`);
														if (response.ok) {
															const data = await response.json();
															if (data.firmware) {
																editingFirmwareId = Number(option.value);
																editingFirmwareRow = {
																	id: data.firmware.id,
																	name: data.firmware.name,
																	memo: data.firmware.memo,
																	firmwareFileName: data.firmware.firmwareFileName,
																	firmwareFileListId: data.firmware.firmwareFileListId,
																	docFileName: data.firmware.docFileName,
																	docFileListId: data.firmware.docFileListId
																} as unknown as Schema;

																newFirmwareName = data.firmware.name || '';
																newFirmwareVersion = data.firmware.version || '';
																newFirmwareMemo = data.firmware.memo || '';
																existingFirmwareFileName = data.firmware.firmwareFileName || null;
																existingFirmwareFileListId =
																	data.firmware.firmwareFileListId || null;
																existingDocFileName = data.firmware.docFileName || null;
																existingDocFileListId = data.firmware.docFileListId || null;
																newFirmwareDocFile = null;
																newFirmwareBinFile = null;

																firmwareEditDialogOpen = true;
																product.openFirmware = false;
															} else {
																toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
															}
														} else {
															toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
														}
													} catch (error) {
														console.error('Failed to load firmware:', error);
														toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
													} finally {
														loadingFirmwareId = null;
													}
												}}
											>
												{#if loadingFirmwareId === Number(option.value)}
													<LoaderIcon class="h-3 w-3 animate-spin" />
												{:else}
													<DotsVerticalIcon class="h-4 w-4" />
												{/if}
												<span class="sr-only">Edit firmware</span>
											</Button>
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					{/key}
				</Popover.Content>
			</Popover.Root>
		</Table.Cell>
		<Table.Cell class="py-2">
			<Input bind:value={product.memo} class="h-8" />
		</Table.Cell>
	</Table.Row>
{/snippet}

{#snippet DraggableDocumentRow({ doc, index }: { doc: DocumentEntry; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: doc.id,
		index: () => index
	})}

	<Table.Row
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
		{@attach ref}
		onclick={(e) => {
			const target = e.target as HTMLElement;
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a')) {
				return;
			}
			openEditDocumentDialog(doc);
		}}
	>
		<Table.Cell class="py-2 pl-4">
			{@render DragHandle({ attach: handleRef })}
		</Table.Cell>
		<Table.Cell class="py-2" onclick={(e) => e.stopPropagation()}>
			<Checkbox
				checked={doc.checked}
				onCheckedChange={(v) => {
					contractDocuments = contractDocuments.map((d) =>
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
							downloadFile(doc.file);
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
					// @ts-expect-error
					const originalFileListId = editingClientRow.registrationFileListId;
					// @ts-expect-error
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
						const currentCustomerId = homeContractCustomer;
						const currentOrdererId = homeContractOrderer;

						editingClientRow = null;
						editingClientId = null;
						validationError = null;

						// Dialog를 먼저 닫고, 닫힘 애니메이션이 시작되도록 함
						clientEditDialogOpen = false;
						await tick();

						await update({ reset: false });
						await invalidate('clients:update');

						previousCustomerId = '';
						previousOrdererId = '';

						await tick();
						await tick();

						if (currentCustomerId && clientList.length > 0) {
							const updatedClient = clientList.find((c) => String(c.id) === currentCustomerId);
							if (updatedClient) {
								homeContractCustomerContact = updatedClient.mainContactName || '';
								homeContractCustomerPosition = updatedClient.mainContactPosition || '';
								homeContractCustomerPhone = updatedClient.mainContactPhone || '';
								homeContractCustomerEmail = updatedClient.mainContactEmail || '';
								homeContractCustomerAddress = updatedClient.address || '';
								previousCustomerId = currentCustomerId;
							}
						}
						if (currentOrdererId && clientList.length > 0) {
							const updatedOrderer = clientList.find((c) => String(c.id) === currentOrdererId);
							if (updatedOrderer) {
								homeContractOrdererContact = updatedOrderer.mainContactName || '';
								homeContractOrdererPosition = updatedOrderer.mainContactPosition || '';
								homeContractOrdererPhone = updatedOrderer.mainContactPhone || '';
								homeContractOrdererEmail = updatedOrderer.mainContactEmail || '';
								homeContractOrdererAddress = updatedOrderer.address || '';
								previousOrdererId = currentOrdererId;
							}
						}

						lastClientListUpdate = Date.now();

						toast.success('고객사가 수정되었습니다.');
					} else if (result.type === 'failure') {
						const wasEditing = editingClientRow !== null;
						const errorMessage =
							result.data?.message ||
							(wasEditing ? '수정에 실패했습니다.' : '추가에 실패했습니다.');
						toast.error(errorMessage);
						console.error('Form action failed:', result);
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				{@render ClientForm()}
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

{#snippet ClientForm()}
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
				<Input name="mainContactName" placeholder="이름" bind:value={newCustomerMainContactName} />
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
				<Input name="subContactName" placeholder="이름" bind:value={newCustomerSubContactName} />
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

		<Separator />

		<Field>
			<FieldLabel>사업자등록증</FieldLabel>
			<FieldContent>
				{#if newCustomerBizLicenseFile}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 truncate">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							<button
								type="button"
								class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline text-left"
								onclick={() => downloadFile(newCustomerBizLicenseFile)}
							>
								{newCustomerBizLicenseFile.name}
							</button>
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => downloadFile(newCustomerBizLicenseFile)}
							>
								<DownloadIcon class="h-4 w-4" />
								<span class="sr-only">Download</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:text-destructive"
								type="button"
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									removeFile('client-biz-license');
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else if existingCustomerRegistrationFileListId && existingCustomerRegistrationFileName}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 min-w-0">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							<a
								href="/api/files/{existingCustomerRegistrationFileListId}"
								class="text-sm text-primary hover:underline overflow-x-auto whitespace-nowrap scrollbar-hide"
								download
							>
								{existingCustomerRegistrationFileName}
							</a>
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() =>
									window.open(`/api/files/${existingCustomerRegistrationFileListId}`, '_blank')}
							>
								<DownloadIcon class="h-4 w-4" />
								<span class="sr-only">Download</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:text-destructive"
								onclick={async () => {
									existingCustomerRegistrationFileName = null;
									existingCustomerRegistrationFileListId = null;
									await tick();
									if (dialogScrollContainer) {
										dialogScrollContainer.scrollTop = dialogScrollContainer.scrollHeight;
									}
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center w-full">
						<label
							for="client-biz-license-file"
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
								id="client-biz-license-file"
								type="file"
								class="hidden"
								onchange={(e) => handleFileChange(e, 'client-biz-license')}
							/>
						</label>
					</div>
				{/if}
			</FieldContent>
		</Field>
	</div>
{/snippet}

{#snippet ProductForm()}
	<div class="space-y-4">
		<Field>
			<FieldLabel>제품명</FieldLabel>
			<FieldContent>
				<Input
					name="productName"
					placeholder="예: IoT 컨트롤러"
					bind:value={newProductName}
					required
					aria-required="true"
				/>
			</FieldContent>
		</Field>
		<div class="grid grid-cols-2 gap-4">
			<Field>
				<FieldLabel>관리코드</FieldLabel>
				<FieldContent>
					<Input name="productCode" placeholder="예: PRD-001" bind:value={newProductCode} />
				</FieldContent>
			</Field>
			<Field>
				<FieldLabel>펌웨어</FieldLabel>
				<FieldContent>
					<Popover.Root bind:open={productFirmwareOpen}>
						<Popover.Trigger bind:ref={productFirmwareTriggerRef}>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									class="w-full justify-between overflow-hidden min-w-0"
									role="combobox"
									aria-expanded={productFirmwareOpen}
								>
									<span class="overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 text-left">
										{firmwareList.find((f) => String(f.id) === newProductFirmwareId)?.name ||
											'펌웨어 선택...'}
									</span>
									<ChevronsUpDownIcon class="opacity-50 shrink-0" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content
							align="start"
							class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0 z-[200]"
						>
							{#key productFirmwareOpen}
								<Command.Root>
									<Command.Input placeholder="펌웨어 검색..." />
									<Command.List>
										<Command.Empty>펌웨어를 찾을 수 없습니다.</Command.Empty>
										<Command.Group>
											{#each firmwareList as firmware (firmware.id)}
												<Command.Item
													value={`${firmware.id} ${firmware.name}`}
													onSelect={() => {
														newProductFirmwareId = String(firmware.id);
														productFirmwareOpen = false;
														tick().then(() => {
															productFirmwareTriggerRef?.focus();
														});
													}}
													class="flex items-center justify-between group"
												>
													<div class="flex items-center gap-2 flex-1 min-w-0">
														<CheckIcon
															class={cn(
																'me-2 size-4 shrink-0',
																String(firmware.id) !== newProductFirmwareId && 'text-transparent'
															)}
														/>
														<span class="overflow-x-auto whitespace-nowrap scrollbar-hide"
															>{firmware.name}</span
														>
													</div>
													<Button
														variant="ghost"
														size="icon"
														class="h-6 w-6 shrink-0 ml-2 pointer-events-auto"
														disabled={loadingFirmwareId === firmware.id}
														onclick={async (e) => {
															e.preventDefault();
															e.stopPropagation();
															e.stopImmediatePropagation();
															loadingFirmwareId = firmware.id;
															try {
																const response = await fetch(`/api/firmware/${firmware.id}`);
																if (response.ok) {
																	const data = await response.json();
																	if (data.firmware) {
																		editingFirmwareId = firmware.id;
																		editingFirmwareRow = {
																			id: data.firmware.id,
																			name: data.firmware.name,
																			memo: data.firmware.memo,
																			firmwareFileName: data.firmware.firmwareFileName,
																			firmwareFileListId: data.firmware.firmwareFileListId,
																			docFileName: data.firmware.docFileName,
																			docFileListId: data.firmware.docFileListId
																		} as unknown as Schema;

																		newFirmwareName = data.firmware.name || '';
																		newFirmwareVersion = data.firmware.version || '';
																		newFirmwareMemo = data.firmware.memo || '';
																		existingFirmwareFileName =
																			data.firmware.firmwareFileName || null;
																		existingFirmwareFileListId =
																			data.firmware.firmwareFileListId || null;
																		existingDocFileName = data.firmware.docFileName || null;
																		existingDocFileListId = data.firmware.docFileListId || null;
																		newFirmwareDocFile = null;
																		newFirmwareBinFile = null;

																		firmwareEditDialogOpen = true;
																		productFirmwareOpen = false;
																	} else {
																		toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
																	}
																} else {
																	toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
																}
															} catch (error) {
																console.error('Failed to load firmware:', error);
																toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
															} finally {
																loadingFirmwareId = null;
															}
														}}
													>
														{#if loadingFirmwareId === firmware.id}
															<LoaderIcon class="h-3 w-3 animate-spin" />
														{:else}
															<DotsVerticalIcon class="h-4 w-4" />
														{/if}
														<span class="sr-only">Edit firmware</span>
													</Button>
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							{/key}
						</Popover.Content>
					</Popover.Root>
					<input type="hidden" name="productFirmwareId" value={newProductFirmwareId} />
				</FieldContent>
			</Field>
		</div>
		<Field>
			<FieldLabel>설명/메모</FieldLabel>
			<FieldContent>
				<Textarea
					name="productMemo"
					placeholder="제품에 대한 설명을 입력하세요."
					class="resize-none"
					bind:value={newProductDescription}
				/>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>단가</FieldLabel>
			<FieldContent>
				<Input name="productPrice" type="number" placeholder="0" bind:value={newProductPrice} />
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>입고/출고 기록</FieldLabel>
			<FieldContent>
				<Dialog.Root bind:open={openInventoryDialog}>
					<Dialog.Overlay class="z-[139]" />
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between overflow-hidden min-w-0"
								{...props}
							>
								{`재고 ${productTotalQuantity}개`}
								<ChevronsUpDownIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content
						showCloseButton={false}
						class="sm:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 z-[140]"
					>
						<Dialog.Header class="px-6 pt-6 pb-2">
							<div class="flex items-center justify-between">
								<Dialog.Title>입고/출고 기록 관리</Dialog.Title>
								<div class="flex items-center gap-2">
									{#if productInventory.some((item) => item.checked)}
										<Button
											variant="destructive"
											size="sm"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												removeSelectedInventory();
											}}
											class="gap-2"
										>
											<TrashIcon class="size-4" />
											선택 삭제
										</Button>
									{/if}
									<Button size="sm" onclick={addInventoryRow} class="gap-2">
										<PlusIcon class="size-4" />
										추가
									</Button>
								</div>
							</div>
						</Dialog.Header>
						<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
							<div class="border rounded-md overflow-hidden">
								{#if productInventory.length === 0}
									<Table.Root>
										<Table.Header class="bg-muted">
											<Table.Row>
												<Table.Head class="w-12"></Table.Head>
												<Table.Head class="w-12">
													<Checkbox checked={false} onCheckedChange={() => {}} />
												</Table.Head>
												<Table.Head>입고/출고</Table.Head>
												<Table.Head>내용</Table.Head>
												<Table.Head>날짜</Table.Head>
												<Table.Head>수량</Table.Head>
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
									<Table.Root>
										<Table.Header class="bg-muted">
											<Table.Row>
												<Table.Head class="w-12"></Table.Head>
												<Table.Head class="w-12">
													<Checkbox
														checked={productInventory.length > 0 &&
															productInventory.every((item) => item.checked)}
														onCheckedChange={(v) => {
															productInventory = productInventory.map((item) => ({
																...item,
																checked: !!v
															}));
														}}
													/>
												</Table.Head>
												<Table.Head>입고/출고</Table.Head>
												<Table.Head>내용</Table.Head>
												<Table.Head>날짜</Table.Head>
												<Table.Head>수량</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each productInventory as item, index (item.id)}
												<Table.Row>
													<Table.Cell class="w-12">
														<GripVerticalIcon class="h-4 w-4 text-muted-foreground" />
													</Table.Cell>
													<Table.Cell class="w-12">
														<Checkbox
															checked={item.checked}
															onCheckedChange={(v) => {
																productInventory = productInventory.map((inv) =>
																	inv.id === item.id ? { ...inv, checked: !!v } : inv
																);
															}}
														/>
													</Table.Cell>
													<Table.Cell>
														<Select.Root type="single" bind:value={item.type}>
															<Select.Trigger class="w-full">
																{item.type === 'in'
																	? '입고'
																	: item.type === 'out'
																		? '출고'
																		: '선택'}
															</Select.Trigger>
															<Select.Content>
																<Select.Item value="in">입고</Select.Item>
																<Select.Item value="out">출고</Select.Item>
															</Select.Content>
														</Select.Root>
													</Table.Cell>
													<Table.Cell>
														<Input
															placeholder="내용"
															bind:value={item.content}
															oninput={(e) => {
																productInventory = productInventory.map((inv) =>
																	inv.id === item.id
																		? { ...inv, content: e.currentTarget.value }
																		: inv
																);
															}}
														/>
													</Table.Cell>
													<Table.Cell>
														<Popover.Root>
															<Popover.Trigger>
																{#snippet child({ props })}
																	<Button
																		variant="outline"
																		{...props}
																		class="w-full justify-start text-left font-normal"
																		type="button"
																	>
																		<CalendarIcon class="mr-2 h-4 w-4" />
																		{item.date
																			? dateFormatter.format(item.date.toDate(getLocalTimeZone()))
																			: '날짜 선택'}
																	</Button>
																{/snippet}
															</Popover.Trigger>
															<Popover.Content class="w-auto p-0 z-[150]" align="start">
																<Calendar
																	type="single"
																	bind:value={item.date}
																	captionLayout="dropdown"
																/>
															</Popover.Content>
														</Popover.Root>
													</Table.Cell>
													<Table.Cell>
														<Input
															type="number"
															placeholder="수량"
															bind:value={item.quantity}
															oninput={(e) => {
																productInventory = productInventory.map((inv) =>
																	inv.id === item.id
																		? { ...inv, quantity: e.currentTarget.value }
																		: inv
																);
															}}
														/>
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
							<Dialog.Close>
								{#snippet child({ props })}
									<Button variant="outline" {...props}>취소</Button>
								{/snippet}
							</Dialog.Close>
							<Button onclick={() => (openInventoryDialog = false)}>저장</Button>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>제품사진</FieldLabel>
			<FieldContent>
				{#if newProductFile}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 truncate">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							<button
								type="button"
								class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline text-left"
								onclick={() => downloadFile(newProductFile)}
							>
								{newProductFile.name}
							</button>
							<span class="text-xs text-muted-foreground">(새 파일)</span>
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => downloadFile(newProductFile)}
							>
								<DownloadIcon class="h-4 w-4" />
								<span class="sr-only">Download</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:text-destructive"
								type="button"
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									removeProductFile();
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else if existingProductFileName}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 min-w-0">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							{#if existingProductFileListId}
								<a
									href="/api/files/{existingProductFileListId}"
									class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline"
									download
								>
									{existingProductFileName}
								</a>
							{:else}
								<span class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide"
									>{existingProductFileName}</span
								>
							{/if}
						</div>
						<div class="flex items-center gap-1">
							{#if existingProductFileListId}
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8"
									onclick={() => {
										window.open(`/api/files/${existingProductFileListId}`, '_blank');
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
								onclick={async () => {
									existingProductFileName = null;
									existingProductFileListId = null;
									await tick();
									if (dialogScrollContainer) {
										dialogScrollContainer.scrollTop = dialogScrollContainer.scrollHeight;
									}
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center w-full">
						<label
							for="product-file"
							class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25"
						>
							<div class="flex flex-col items-center justify-center pt-5 pb-6">
								<FileIcon class="w-8 h-8 mb-2 text-muted-foreground" />
								<p class="text-sm text-muted-foreground">
									<span class="font-semibold">파일 업로드</span>
								</p>
								<p class="text-xs text-muted-foreground">SVG, PNG, JPG 또는 GIF</p>
							</div>
							<input
								type="file"
								class="hidden"
								onchange={(e) => handleFileChange(e, 'product-photo')}
							/>
						</label>
					</div>
				{/if}
			</FieldContent>
		</Field>
	</div>
{/snippet}

{#snippet FirmwareForm()}
	<div class="space-y-4">
		<Field>
			<FieldLabel>이름</FieldLabel>
			<FieldContent>
				<Input name="firmwareName" placeholder="예: 펌웨어 v1.0" bind:value={newFirmwareName} />
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>메모</FieldLabel>
			<FieldContent>
				<Textarea
					name="firmwareMemo"
					placeholder="펌웨어 변경사항이나 메모를 입력하세요."
					class="resize-none"
					bind:value={newFirmwareMemo}
				/>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>관련문서</FieldLabel>
			<FieldContent>
				{#if newFirmwareDocFile}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 truncate">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							<button
								type="button"
								class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline text-left"
								onclick={() => downloadFile(newFirmwareDocFile)}
							>
								{newFirmwareDocFile.name}
							</button>
							<span class="text-xs text-muted-foreground">(새 파일)</span>
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => downloadFile(newFirmwareDocFile)}
							>
								<DownloadIcon class="h-4 w-4" />
								<span class="sr-only">Download</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:text-destructive"
								type="button"
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									removeFirmwareFile('firmware-doc');
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else if existingDocFileName}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 min-w-0">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							{#if existingDocFileListId}
								<a
									href="/api/files/{existingDocFileListId}"
									class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline"
									download
								>
									{existingDocFileName}
								</a>
							{:else}
								<span class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide"
									>{existingDocFileName}</span
								>
							{/if}
						</div>
						<div class="flex items-center gap-1">
							{#if existingDocFileListId}
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8"
									onclick={() => {
										window.open(`/api/files/${existingDocFileListId}`, '_blank');
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
								onclick={async () => {
									existingDocFileName = null;
									existingDocFileListId = null;
									await tick();
									if (dialogScrollContainer) {
										dialogScrollContainer.scrollTop = dialogScrollContainer.scrollHeight;
									}
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center w-full">
						<label
							for="firmware-doc-file"
							class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25"
						>
							<div class="flex flex-col items-center justify-center pt-5 pb-6">
								<FileIcon class="w-8 h-8 mb-2 text-muted-foreground" />
								<p class="text-sm text-muted-foreground">
									<span class="font-semibold">파일 업로드</span>
								</p>
								<p class="text-xs text-muted-foreground">PDF, DOCX 등</p>
							</div>
							<input
								id="firmware-doc-file"
								name="firmwareDocFile"
								type="file"
								class="hidden"
								onchange={(e) => handleFileChange(e, 'firmware-doc')}
							/>
						</label>
					</div>
				{/if}
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>펌웨어</FieldLabel>
			<FieldContent>
				{#if newFirmwareBinFile}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 truncate">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							<button
								type="button"
								class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline text-left"
								onclick={() => downloadFile(newFirmwareBinFile)}
							>
								{newFirmwareBinFile.name}
							</button>
							<span class="text-xs text-muted-foreground">(새 파일)</span>
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => downloadFile(newFirmwareBinFile)}
							>
								<DownloadIcon class="h-4 w-4" />
								<span class="sr-only">Download</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-destructive hover:text-destructive"
								type="button"
								onclick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									removeFirmwareFile('firmware-bin');
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else if existingFirmwareFileName}
					<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
						<div class="flex items-center gap-2 min-w-0">
							<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
							{#if existingFirmwareFileListId}
								<a
									href="/api/files/{existingFirmwareFileListId}"
									class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide text-primary hover:underline"
									download
								>
									{existingFirmwareFileName}
								</a>
							{:else}
								<span class="text-sm overflow-x-auto whitespace-nowrap scrollbar-hide"
									>{existingFirmwareFileName}</span
								>
							{/if}
						</div>
						<div class="flex items-center gap-1">
							{#if existingFirmwareFileListId}
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8"
									onclick={() => {
										window.open(`/api/files/${existingFirmwareFileListId}`, '_blank');
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
								onclick={async () => {
									existingFirmwareFileName = null;
									existingFirmwareFileListId = null;
									await tick();
									if (dialogScrollContainer) {
										dialogScrollContainer.scrollTop = dialogScrollContainer.scrollHeight;
									}
								}}
							>
								<XIcon class="h-4 w-4" />
								<span class="sr-only">Remove</span>
							</Button>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center w-full">
						<label
							for="firmware-bin-file"
							class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25"
						>
							<div class="flex flex-col items-center justify-center pt-5 pb-6">
								<FileIcon class="w-8 h-8 mb-2 text-muted-foreground" />
								<p class="text-sm text-muted-foreground">
									<span class="font-semibold">파일 업로드</span>
								</p>
								<p class="text-xs text-muted-foreground">BIN, HEX 등</p>
							</div>
							<input
								id="firmware-bin-file"
								name="firmwareBinFile"
								type="file"
								class="hidden"
								onchange={(e) => handleFileChange(e, 'firmware-bin')}
							/>
						</label>
					</div>
				{/if}
			</FieldContent>
		</Field>
	</div>
{/snippet}

<!-- 펌웨어 수정 Dialog -->
<Dialog.Root
	bind:open={firmwareEditDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			setTimeout(() => {
				resetFirmwareEditDialog();
			}, 200);
		}
	}}
>
	<Dialog.Overlay class="z-[209]" />
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 z-[210]">
		<div class="px-6 pt-6">
			<Dialog.Header>
				<Dialog.Title>펌웨어 수정</Dialog.Title>
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action="/firmware?/updateFirmware"
			use:enhance={({ formData, cancel }) => {
				if (!newFirmwareName || !newFirmwareName.trim()) {
					validationError = '펌웨어 이름을 입력하세요.';
					setTimeout(() => {
						validationError = null;
					}, 5000);
					cancel();
					return;
				}

				validationError = null;

				if (editingFirmwareRow) {
					formData.set('id', String(editingFirmwareRow.id));
				}

				if (editingFirmwareRow) {
					// @ts-expect-error
					const originalFirmwareFileListId = editingFirmwareRow.firmwareFileListId;
					// @ts-expect-error
					const originalDocFileListId = editingFirmwareRow.docFileListId;

					if (originalFirmwareFileListId && !existingFirmwareFileListId && !newFirmwareBinFile) {
						formData.set('removeFirmwareFile', 'true');
					}
					if (originalDocFileListId && !existingDocFileListId && !newFirmwareDocFile) {
						formData.set('removeDocFile', 'true');
					}
				}
				if (newFirmwareBinFile) {
					formData.set('firmwareBinFile', newFirmwareBinFile);
				}
				if (newFirmwareDocFile) {
					formData.set('firmwareDocFile', newFirmwareDocFile);
				}

				formData.set('firmwareName', newFirmwareName || '');
				formData.set('firmwareVersion', newFirmwareVersion || '');
				formData.set('firmwareMemo', newFirmwareMemo || '');

				return async ({ result, update }) => {
					if (result.type === 'success') {
						// Dialog를 먼저 닫고, 닫힘 애니메이션이 시작되도록 함
						firmwareEditDialogOpen = false;
						await tick();

						await update({ reset: false });
						await invalidate('firmware:update');
						await tick();
						await tick();
						toast.success('펌웨어가 수정되었습니다.');
					} else if (result.type === 'failure') {
						const errorMessage = result.data?.message || '수정에 실패했습니다.';
						toast.error(errorMessage);
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				{@render FirmwareForm()}
			</div>

			<div class="px-6 pb-6">
				<Dialog.Footer class="flex-row justify-end gap-2">
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							resetFirmwareEditDialog();
							validationError = null;
							firmwareEditDialogOpen = false;
						}}
					>
						취소
					</Button>
					<Button
						type="submit"
						disabled={submittingContract || submittingFirmware || !newFirmwareName?.trim()}
					>
						{#if submittingContract || submittingFirmware}
							<Spinner class="size-4" />
						{/if}
						수정
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- 제품 수정 Dialog -->
<Dialog.Root
	bind:open={productEditDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			setTimeout(() => {
				resetProductEditDialog();
			}, 200);
		}
	}}
>
	<Dialog.Overlay class="z-[139]" />
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 z-[140]">
		<div class="px-6 pt-6">
			<Dialog.Header>
				<Dialog.Title>제품 수정</Dialog.Title>
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action="/products?/updateProduct"
			use:enhance={({ formData, cancel }) => {
				if (!newProductName || !newProductName.trim()) {
					validationError = '제품명을 입력하세요.';
					setTimeout(() => {
						validationError = null;
					}, 5000);
					cancel();
					return;
				}

				validationError = null;

				if (editingProductRow) {
					formData.set('id', String(editingProductRow.id));
				}

				if (editingProductRow) {
					// @ts-expect-error
					const originalFileListId = editingProductRow.photoFileListId;
					if (originalFileListId && !existingProductFileListId && !newProductFile) {
						formData.set('removeProductFile', 'true');
					}
				}
				if (newProductFile) {
					formData.set('productFile', newProductFile);
				}

				formData.set('productName', newProductName || '');
				formData.set('productCode', newProductCode || '');
				formData.set('productVersion', newProductVersion || '');
				formData.set('productPrice', newProductPrice || '0');
				formData.set('productMemo', newProductDescription || '');
				formData.set('productFirmwareId', newProductFirmwareId || '');
				formData.set(
					'inventoryData',
					JSON.stringify(
						productInventory.map((item) => ({
							type: item.type,
							content: item.content,
							date: item.date ? dateValueToString(item.date) : null,
							quantity: item.quantity ? parseInt(item.quantity) || 0 : 0
						}))
					)
				);

				return async ({ result, update }) => {
					if (result.type === 'success') {
						// Dialog를 먼저 닫고, 닫힘 애니메이션이 시작되도록 함
						productEditDialogOpen = false;
						await tick();

						await update({ reset: false });
						await invalidate('products:update');
						await tick();
						await tick();
						toast.success('제품이 수정되었습니다.');
					} else if (result.type === 'failure') {
						const errorMessage = result.data?.message || '수정에 실패했습니다.';
						toast.error(errorMessage);
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				{@render ProductForm()}
			</div>

			<div class="px-6 pb-6">
				<Dialog.Footer class="flex-row justify-end gap-2">
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							resetProductEditDialog();
							validationError = null;
							productEditDialogOpen = false;
						}}
					>
						취소
					</Button>
					<Button
						type="submit"
						disabled={submittingContract || submittingProduct || !newProductName?.trim()}
					>
						{#if submittingContract || submittingProduct}
							<Spinner class="size-4" />
						{/if}
						수정
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#snippet DraggableTaxInvoiceRow({ invoice, index }: { invoice: TaxInvoiceRecord; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: invoice.id,
		index: () => index
	})}

	<Table.Row
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
		{@attach ref}
	>
		<Table.Cell class="p-2 w-12 text-center">
			{@render DragHandle({ attach: handleRef })}
		</Table.Cell>
		<Table.Cell class="p-2 w-12 text-center">
			<Checkbox
				checked={invoice.checked}
				onCheckedChange={(v) => {
					homeContractTaxInvoices = homeContractTaxInvoices.map((inv, i) =>
						i === index ? { ...inv, checked: !!v } : inv
					);
				}}
			/>
		</Table.Cell>
		<Table.Cell class="p-2">
			<Popover.Root bind:open={invoice.issueDateOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							class="w-full justify-start text-left font-normal"
							type="button"
							{...props}
						>
							<CalendarIcon class="me-2 size-4" />
							{invoice.issueDate
								? dateFormatter.format(invoice.issueDate.toDate(getLocalTimeZone()))
								: '발행일 선택'}
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0 z-[250]">
					<Calendar type="single" bind:value={invoice.issueDate} captionLayout="dropdown" />
				</Popover.Content>
			</Popover.Root>
		</Table.Cell>
		<Table.Cell class="p-2">
			<Input
				type="text"
				placeholder="금액"
				bind:value={invoice.amount}
				oninput={(e) => {
					invoice.amount = formatCurrency(e.currentTarget.value);
				}}
			/>
		</Table.Cell>
		<Table.Cell class="p-2">
			<Input type="text" placeholder="메모" bind:value={invoice.memo} />
		</Table.Cell>
	</Table.Row>
{/snippet}

{#snippet DraggableInterimPaymentRow({
	payment,
	index
}: {
	payment: {
		id: string;
		amount: string;
		date: DateValue | undefined;
		memo: string;
		checked: boolean;
	};
	index: number;
})}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: payment.id,
		index: () => index
	})}

	<Table.Row
		data-dragging={isDragging.current}
		class="relative z-0 bg-card data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
		{@attach ref}
	>
		<Table.Cell class="p-2 w-12 text-center">
			{@render DragHandle({ attach: handleRef })}
		</Table.Cell>

		<Table.Cell class="p-2 w-12 text-center">
			<Checkbox
				checked={payment.checked}
				onCheckedChange={(v) => {
					homeContractInterimPayments = homeContractInterimPayments.map((inv, i) =>
						i === index ? { ...inv, checked: !!v } : inv
					);
				}}
			/>
		</Table.Cell>

		<Table.Cell class="p-2">
			<Input
				type="text"
				placeholder="금액"
				bind:value={payment.amount}
				oninput={(e) => {
					payment.amount = formatCurrency(e.currentTarget.value);
				}}
			/>
		</Table.Cell>

		<Table.Cell class="p-2">
			<div class="w-full">
				<Popover.Root>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class={cn(
									'w-full justify-start text-start font-normal',
									!payment.date && 'text-muted-foreground'
								)}
								{...props}
							>
								<CalendarIcon class="me-2 size-4" />
								{payment.date
									? dateFormatter.format(payment.date.toDate(getLocalTimeZone()))
									: '납부일 선택'}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="flex auto p-0 border-none justify-start relative z-[300]">
						<Calendar
							type="single"
							value={payment.date}
							onValueChange={(v) => {
								payment.date = v;
							}}
							captionLayout="dropdown"
						/>
					</Popover.Content>
				</Popover.Root>
			</div>
		</Table.Cell>

		<Table.Cell class="p-2">
			<Input type="text" placeholder="메모" bind:value={payment.memo} />
		</Table.Cell>
	</Table.Row>
{/snippet}
