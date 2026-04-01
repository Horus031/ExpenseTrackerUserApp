import React, { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DatePickerFieldProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value: string): Date {
  const parts = value.split("-");
  if (parts.length !== 3) {
    return new Date();
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return new Date();
  }

  return new Date(year, month, day);
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function DatePickerField({
  value,
  onChange,
  label,
}: DatePickerFieldProps) {
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const [visible, setVisible] = useState(false);
  const [cursorMonth, setCursorMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const days = useMemo(() => {
    const year = cursorMonth.getFullYear();
    const month = cursorMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { key: string; date?: Date }[] = [];

    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ key: `day-${day}`, date: new Date(year, month, day) });
    }

    return cells;
  }, [cursorMonth]);

  const open = () => {
    setCursorMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
    setVisible(true);
  };

  const close = () => setVisible(false);

  const previousMonth = () => {
    setCursorMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCursorMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.field} onPress={open} activeOpacity={0.8}>
        <Text style={styles.fieldValue}>{value || "Select date"}</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={previousMonth}
                style={styles.navButton}
              >
                <Text style={styles.navButtonText}>Prev</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {getMonthLabel(cursorMonth)}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                <Text style={styles.navButtonText}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((cell) => {
                if (!cell.date) {
                  return <View key={cell.key} style={styles.dayCell} />;
                }

                const iso = formatDate(cell.date);
                const isSelected = iso === value;

                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                    ]}
                    onPress={() => {
                      onChange(iso);
                      close();
                    }}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {cell.date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.footerButton, styles.todayButton]}
                onPress={() => {
                  onChange(formatDate(new Date()));
                  close();
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerButton} onPress={close}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  field: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  fieldValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  navButtonText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#777",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.2857%",
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 4,
  },
  dayCellSelected: {
    backgroundColor: "#3498DB",
  },
  dayText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "500",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F2F2F2",
  },
  todayButton: {
    backgroundColor: "#3498DB",
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  cancelButtonText: {
    color: "#444",
    fontWeight: "600",
    fontSize: 13,
  },
});
