import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  calculateProjectTotalExpense,
  createExpense,
  deleteExpense,
  fetchExpensesByProjectId,
  getExpenseSummaryByType,
  updateExpense,
} from "@/services/api/expenseService";
import { analyzeReceiptImageWithGemini } from "@/services/api/receiptAnalysisService";
import {
  CreateExpensePayload,
  Expense,
  ExpenseType,
  PaymentMethod,
  PaymentStatus,
} from "@/types";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
interface ExpenseManagementProps {
  projectId: string;
  projectBudget: number;
}

export const ExpenseManagementComponent: React.FC<ExpenseManagementProps> = ({
  projectId,
  projectBudget,
}) => {
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteExpense, setPendingDeleteExpense] =
    useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);
  const [totalExpense, setTotalExpense] = useState(0);
  const [expenseSummary, setExpenseSummary] = useState<Record<string, number>>(
    {},
  );

  // Form state
  const [form, setForm] = useState<CreateExpensePayload>({
    projectId,
    expenseCode: "",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    currency: "USD",
    type: ExpenseType.MISCELLANEOUS,
    paymentMethod: PaymentMethod.CASH,
    claimant: "",
    paymentStatus: PaymentStatus.PENDING,
    description: "",
    location: "",
  });

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchExpensesByProjectId(projectId);
      setExpenses(data);
      const total = await calculateProjectTotalExpense(projectId);
      setTotalExpense(total);
      const summary = await getExpenseSummaryByType(projectId);
      setExpenseSummary(summary);
    } catch (error) {
      console.error("Error loading expenses:", error);
      Alert.alert("Error", "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadExpenses();
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setForm({
      projectId,
      expenseCode: "",
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      currency: "USD",
      type: ExpenseType.MISCELLANEOUS,
      paymentMethod: PaymentMethod.CASH,
      claimant: "",
      paymentStatus: PaymentStatus.PENDING,
      description: "",
      location: "",
    });
    setEditingExpense(null);
  };

  const handleAddEdit = async () => {
    if (!form.claimant || !form.date || form.amount <= 0) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, form);
        Alert.alert("Success", "Expense updated successfully");
      } else {
        await createExpense(form);
        Alert.alert("Success", "Expense created successfully");
      }
      setShowModal(false);
      resetForm();
      await loadExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      Alert.alert("Error", "Failed to save expense");
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      projectId: expense.projectId,
      expenseCode: expense.expenseCode,
      date: expense.date,
      amount: expense.amount,
      currency: expense.currency,
      type: expense.type as ExpenseType,
      paymentMethod: expense.paymentMethod as PaymentMethod,
      claimant: expense.claimant,
      paymentStatus: expense.paymentStatus as PaymentStatus,
      description: expense.description,
      location: expense.location,
    });
    setShowModal(true);
  };

  const handleDelete = (expense: Expense) => {
    setPendingDeleteExpense(expense);
    setShowDeleteModal(true);
  };

  const mergeAnalyzedFormValues = (
    currentForm: CreateExpensePayload,
    extracted: Partial<CreateExpensePayload>,
    receiptUri?: string,
  ): CreateExpensePayload => {
    return {
      ...currentForm,
      date: extracted.date ?? currentForm.date,
      amount: extracted.amount ?? currentForm.amount,
      currency: extracted.currency ?? currentForm.currency,
      type: extracted.type ?? currentForm.type,
      paymentMethod: extracted.paymentMethod ?? currentForm.paymentMethod,
      claimant: extracted.claimant ?? currentForm.claimant,
      paymentStatus: extracted.paymentStatus ?? currentForm.paymentStatus,
      description: extracted.description ?? currentForm.description,
      location: extracted.location ?? currentForm.location,
      expenseCode: extracted.expenseCode ?? currentForm.expenseCode,
      receiptPath: receiptUri ?? currentForm.receiptPath,
    };
  };

  const handleScanReceipt = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera permission required",
          "Please allow camera access to capture receipt images.",
        );
        return;
      }

      const captureResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });

      if (captureResult.canceled || captureResult.assets.length === 0) {
        return;
      }

      const asset = captureResult.assets[0];
      if (!asset.base64 || !asset.mimeType) {
        Alert.alert(
          "Cannot read receipt image",
          "Please try taking the photo again.",
        );
        return;
      }

      setAnalyzingReceipt(true);
      const analysis = await analyzeReceiptImageWithGemini({
        imageBase64: asset.base64,
        mimeType: asset.mimeType,
      });

      setForm((prev) =>
        mergeAnalyzedFormValues(prev, analysis.extracted, asset.uri),
      );

      Alert.alert(
        "Receipt analyzed",
        `${analysis.confidenceNote}\n\nPlease review and correct the fields before saving.`,
      );
    } catch (error) {
      console.error("Error scanning receipt:", error);
      Alert.alert(
        "Receipt analysis failed",
        "Could not analyze this receipt. Please fill the form manually or try again.",
      );
    } finally {
      setAnalyzingReceipt(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!pendingDeleteExpense) {
      return;
    }

    setDeleting(true);
    try {
      const deleted = await deleteExpense(pendingDeleteExpense.id);
      if (!deleted) {
        throw new Error("Delete request was not successful");
      }

      setShowDeleteModal(false);
      setPendingDeleteExpense(null);
      await loadExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      Alert.alert("Error", "Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  const budgetPercentage = Math.round((totalExpense / projectBudget) * 100);
  const remainingBudget = projectBudget - totalExpense;

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const statusColor =
      item.paymentStatus === PaymentStatus.PAID
        ? "#27AE60"
        : item.paymentStatus === PaymentStatus.REIMBURSED
          ? "#E74C3C"
          : "#e7b13c";

    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseHeader}>
          <View>
            <Text style={styles.expenseCode}>{item.expenseCode}</Text>
            <Text style={styles.expenseType}>{item.type}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.paymentStatus}
            </Text>
          </View>
        </View>

        <Text style={styles.expenseAmount}>
          {item.currency} {item.amount.toFixed(2)}
        </Text>
        <Text style={styles.expenseDate}>{item.date}</Text>
        <Text style={styles.expenseClaimant}>Claimant: {item.claimant}</Text>
        {item.description && (
          <Text style={styles.expenseDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.expenseActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.budgetSection}>
        <View style={styles.budgetCard}>
          <Text style={styles.budgetLabel}>Total Budget</Text>
          <Text style={styles.budgetAmount}>${projectBudget}</Text>
        </View>
        <View style={styles.budgetCard}>
          <Text style={styles.budgetLabel}>Spent</Text>
          <Text style={[styles.budgetAmount, { color: "#E74C3C" }]}>
            ${totalExpense}
          </Text>
        </View>
        <View style={styles.budgetCard}>
          <Text style={styles.budgetLabel}>Remaining</Text>
          <Text
            style={[
              styles.budgetAmount,
              { color: remainingBudget < 0 ? "#E74C3C" : "#27AE60" },
            ]}
          >
            ${remainingBudget}
          </Text>
        </View>
      </View>

      <View style={styles.budgetProgressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(budgetPercentage, 100)}%`,
                backgroundColor: budgetPercentage > 100 ? "#E74C3C" : "#3498DB",
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {budgetPercentage}% of budget used
        </Text>
      </View>

      {Object.keys(expenseSummary).length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Expense by Type</Text>
          {Object.entries(expenseSummary).map(([type, amount]) => (
            <View key={type} style={styles.summaryRow}>
              <Text style={styles.summaryType}>{type}</Text>
              <Text style={styles.summaryAmount}>${amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.expenseListHeader}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Text style={styles.addBtnText}>Create Expense</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3498DB"
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No expenses added yet.</Text>
          }
        />
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View
          style={[
            styles.modal,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.closeBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </Text>
              <TouchableOpacity
                onPress={handleAddEdit}
                disabled={analyzingReceipt}
              >
                <Text style={styles.saveBtn}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <TouchableOpacity
                style={[
                  styles.scanReceiptBtn,
                  analyzingReceipt && styles.scanReceiptBtnDisabled,
                ]}
                onPress={() => {
                  void handleScanReceipt();
                }}
                disabled={analyzingReceipt}
              >
                {analyzingReceipt ? (
                  <View style={styles.scanReceiptLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.scanReceiptBtnText}>
                      Analyzing receipt...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.scanReceiptBtnText}>
                    Capture Receipt with Camera
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.scanReceiptHint}>
                AI will auto-fill the form from the receipt. Please review every
                field before saving.
              </Text>

              <Text style={styles.label}>Date *</Text>
              <DatePickerField
                value={form.date}
                onChange={(date) => setForm({ ...form, date })}
              />

              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={form.amount.toString()}
                onChangeText={(text) =>
                  setForm({ ...form, amount: parseFloat(text) || 0 })
                }
              />

              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                placeholder="USD"
                value={form.currency}
                onChangeText={(text) => setForm({ ...form, currency: text })}
              />

              <Text style={styles.label}>Type of Expense *</Text>
              <View style={styles.pickerContainer}>
                {Object.values(ExpenseType).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pickerOption,
                      form.type === type && styles.pickerOptionActive,
                    ]}
                    onPress={() => setForm({ ...form, type })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.type === type && styles.pickerOptionTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Payment Method *</Text>
              <View style={styles.pickerContainer}>
                {Object.values(PaymentMethod).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.pickerOption,
                      form.paymentMethod === method &&
                        styles.pickerOptionActive,
                    ]}
                    onPress={() => setForm({ ...form, paymentMethod: method })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.paymentMethod === method &&
                          styles.pickerOptionTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Claimant *</Text>
              <TextInput
                style={styles.input}
                placeholder="Name of the claimant"
                value={form.claimant}
                onChangeText={(text) => setForm({ ...form, claimant: text })}
              />

              <Text style={styles.label}>Payment Status *</Text>
              <View style={styles.pickerContainer}>
                {Object.values(PaymentStatus).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.pickerOption,
                      form.paymentStatus === status &&
                        styles.pickerOptionActive,
                    ]}
                    onPress={() => setForm({ ...form, paymentStatus: status })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.paymentStatus === status &&
                          styles.pickerOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                value={form.location}
                onChangeText={(text) => setForm({ ...form, location: text })}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>Delete Expense</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete
              {pendingDeleteExpense
                ? ` ${pendingDeleteExpense.expenseCode}`
                : " this expense"}
              ?
            </Text>

            <View style={styles.deleteActionsRow}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setPendingDeleteExpense(null);
                  }
                }}
                disabled={deleting}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={() => {
                  void confirmDeleteExpense();
                }}
                disabled={deleting}
              >
                <Text style={styles.deleteConfirmText}>
                  {deleting ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  budgetSection: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  budgetCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    marginBottom: 6,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  budgetProgressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  summaryType: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  summaryAmount: {
    fontSize: 13,
    color: "#3498DB",
    fontWeight: "700",
  },
  expenseListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  addBtn: {
    backgroundColor: "#3498DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  expenseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  expenseCode: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3498DB",
    marginBottom: 4,
  },
  expenseType: {
    fontSize: 12,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  expenseClaimant: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  expenseDescription: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 10,
  },
  expenseActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#E8F4F8",
  },
  deleteBtn: {
    backgroundColor: "#F8E8E8",
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C0392B",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3498DB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  // Modal styles
  modal: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeBtn: {
    fontSize: 16,
    color: "#E74C3C",
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  saveBtn: {
    fontSize: 16,
    color: "#27AE60",
    fontWeight: "600",
  },
  formSection: {
    padding: 16,
  },
  scanReceiptBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  scanReceiptBtnDisabled: {
    backgroundColor: "#8AA7F4",
  },
  scanReceiptLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanReceiptBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  scanReceiptHint: {
    color: "#555",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  pickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F9F9F9",
  },
  pickerOptionActive: {
    backgroundColor: "#3498DB",
    borderColor: "#3498DB",
  },
  pickerOptionText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  pickerOptionTextActive: {
    color: "#FFFFFF",
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  deleteCancelBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
    paddingVertical: 11,
    alignItems: "center",
  },
  deleteCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
  },
  deleteConfirmBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#C0392B",
    paddingVertical: 11,
    alignItems: "center",
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
